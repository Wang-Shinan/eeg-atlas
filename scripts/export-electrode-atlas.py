#!/usr/bin/env python3
"""Export real template coordinates/surfaces; never fit or invent missing geometry.

Install scripts/requirements-atlas.txt first. All inputs ship with those packages;
fetch_surf_fsaverage('fsaverage5') is the packaged, offline dataset, not a download.
Output units are metres in MNE head coordinates. Run with --check to validate an
existing export against MNE again without modifying it.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path

import mne
import nibabel as nib
import numpy as np
from mne.transforms import apply_trans, invert_transform
from nilearn.datasets import fetch_surf_fsaverage

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/atlas/data/atlas.json'
VERSIONS = {'mne': '1.13.2', 'nilearn': '0.12.1', 'nibabel': '5.3.2'}
TEMPLATES = [
    ('10–20', 'fsaverage_1020', 21), ('10–10', 'fsaverage_1010', 70),
    *[('BioSemi', f'biosemi{n}', n) for n in (32, 64, 128, 256)],
    *[('HydroCel', f'GSN-HydroCel-{n}', n) for n in (128, 129, 256, 257)],
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_array(value, columns=3):
    array = np.asarray(value, dtype=float)
    if array.ndim != 2 or array.shape[1] != columns or not np.isfinite(array).all():
        raise ValueError(f'Invalid coordinate array: {array.shape}')
    if columns == 3 and np.max(np.abs(array)) > .5:
        raise ValueError('Coordinates exceed 0.5 m; check units before rendering.')
    return array


def export_montage(family, name, expected):
    # "auto" is part of the recipe, not an unrecorded renderer-side fit.
    montage = mne.channels.make_standard_montage(name, head_size='auto')
    native = montage.get_positions()
    trans = mne.channels.compute_native_head_t(montage)
    matrix = np.asarray(trans['trans'])
    rotation = matrix[:3, :3]
    if not np.allclose(rotation.T @ rotation, np.eye(3), atol=1e-6):
        raise ValueError(f'{name}: non-rigid transformation')
    if not np.isclose(np.linalg.det(rotation), 1, atol=1e-6):
        raise ValueError(f'{name}: reflection detected')
    names = montage.ch_names
    if len(names) != expected or len(set(names)) != expected:
        raise ValueError(f'{name}: expected {expected} unique electrodes, got {len(names)}')
    xyz = checked_array([native['ch_pos'][name] for name in names])
    head = checked_array(apply_trans(trans, xyz))
    fiducials = {}
    for key in ('nasion', 'lpa', 'rpa'):
        if native[key] is None:
            raise ValueError(f'{name}: missing {key}; refusing an assumed alignment')
        fiducials[key] = np.round(apply_trans(trans, native[key]), 9).tolist()
    if not (fiducials['lpa'][0] < 0 < fiducials['rpa'][0] and fiducials['nasion'][1] > 0):
        raise ValueError(f'{name}: incorrect head-coordinate handedness')
    return dict(
        id=name, family=family, label=name, count=len(names), names=names,
        positions=np.round(head, 9).tolist(), nativePositions=np.round(xyz, 9).tolist(),
        nativeFrame=native['coord_frame'], nativeToHead=matrix.tolist(),
        fiducials=fiducials,
        recipe=f'mne.channels.make_standard_montage({name!r}, head_size="auto")',
        note='MNE 模板及其默认头尺寸；仅做原生到头坐标的刚体变换，未另行缩放、投影或个体配准。',
    )


def surface(name, vertices, faces, trans):
    xyz = checked_array(apply_trans(trans, checked_array(vertices)))
    tri = np.asarray(faces, dtype=int)
    if tri.ndim != 2 or tri.shape[1] != 3 or tri.min() < 0 or tri.max() >= len(xyz):
        raise ValueError(f'{name}: invalid triangles')
    if len(xyz) >= 65536:
        raise ValueError(f'{name}: mesh exceeds the WebGL1 16-bit index limit')
    return dict(name=name, positions=np.round(xyz, 7).reshape(-1).tolist(), triangles=tri.reshape(-1).tolist())


def build():
    installed = {name: importlib.metadata.version(name) for name in VERSIONS}
    if installed != VERSIONS:
        raise RuntimeError(f'Expected {VERSIONS}; installed {installed}. Install scripts/requirements-atlas.txt.')
    available = set(mne.channels.get_builtin_montages())
    missing = {name for _, name, _ in TEMPLATES} - available
    if missing:
        raise RuntimeError(f'Missing MNE templates: {sorted(missing)}; no substitute coordinates will be generated.')
    base = Path(mne.__file__).resolve().parent
    fs = base / 'data/fsaverage'
    trans_path = fs / 'fsaverage-trans.fif'
    head_to_mri = mne.read_trans(trans_path, verbose=False)
    if int(head_to_mri['from']) != 4 or int(head_to_mri['to']) != 5:
        raise ValueError('Expected fsaverage head → MRI transform')
    mri_to_head = invert_transform(head_to_mri)
    head_path = fs / 'fsaverage-head.fif'
    scalp = mne.read_bem_surfaces(head_path, verbose=False)[0]
    if int(scalp['coord_frame']) != 5:
        raise ValueError('Expected scalp mesh in MRI surface RAS')
    meshes = [surface('scalp', scalp['rr'], scalp['tris'], mri_to_head)]
    hashes = {'fsaverage-head.fif': sha256(head_path), 'fsaverage-trans.fif': sha256(trans_path)}
    data = fetch_surf_fsaverage(mesh='fsaverage5')
    for side in ('left', 'right'):
        path = Path(data[f'pial_{side}'])
        gifti = nib.load(path)
        rr = gifti.get_arrays_from_intent('NIFTI_INTENT_POINTSET')[0].data
        tris = gifti.get_arrays_from_intent('NIFTI_INTENT_TRIANGLE')[0].data
        # FreeSurfer fsaverage5 GIFTI uses surface-RAS millimetres.
        if not 20 < np.max(np.abs(rr)) < 250:
            raise ValueError('Unexpected pial coordinate units')
        if (side == 'left' and np.mean(rr[:, 0]) >= 0) or (side == 'right' and np.mean(rr[:, 0]) <= 0):
            raise ValueError('Pial hemisphere / left-right orientation mismatch')
        meshes.append(surface(f'brain-{side}', rr.astype(float) / 1000, tris, mri_to_head))
        hashes[f'pial_{side}.gii.gz'] = sha256(path)
    montage_dir = base / 'channels/data/montages'
    montage_hashes = {p.name: sha256(p) for p in sorted(montage_dir.iterdir()) if p.is_file()}
    fids, frame = mne.io.read_fiducials(fs / 'fsaverage-fiducials.fif', verbose=False)
    if int(frame) != 5:
        raise ValueError('Expected fsaverage fiducials in MRI coordinates')
    labels = {1: 'LPA', 2: 'NAS', 3: 'RPA'}
    return dict(
        schemaVersion=1, units='m', coordinateFrame='head', versions=installed,
        axes={'x': 'right', 'y': 'anterior', 'z': 'superior'},
        sourceHashes=hashes, montageSourceHashes=montage_hashes,
        mriToHead=np.asarray(mri_to_head['trans']).tolist(),
        fiducials=[dict(name=labels[int(p['ident'])], position=np.round(apply_trans(mri_to_head, p['r']), 9).tolist()) for p in fids],
        montages=[export_montage(*t) for t in TEMPLATES], meshes=meshes,
        provenance={
            'coordinates': 'MNE-Python built-in templates; default head_size="auto". Not participant digitizations.',
            'brain': 'FreeSurfer fsaverage5 pial surfaces distributed with Nilearn 0.12.1; original mesh resolution preserved.',
            'scalp': 'MNE bundled fsaverage-head.fif; original mesh resolution preserved.',
            'transforms': 'Pial mm → m; fsaverage MRI → MNE head. No surface fitting, projection, inflation, or channel jitter.',
            'licenses': '../THIRD_PARTY_NOTICES.txt',
            'sources': ['https://mne.tools/stable/auto_tutorials/intro/40_sensor_locations.html',
                        'https://github.com/nilearn/nilearn/tree/0.12.1/nilearn/datasets/data/fsaverage5',
                        'https://surfer.nmr.mgh.harvard.edu/fswiki/FsAverage'],
        },
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build()
    serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n'
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != serialized:
            raise RuntimeError('Atlas export differs from pinned source packages. Regenerate it.')
        print('PASS: template counts, handedness, units, rigid transforms, mesh indices and reproducible export.')
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        temporary = OUTPUT.with_suffix('.tmp')
        temporary.write_text(serialized, encoding='utf-8')
        temporary.replace(OUTPUT)
        print(f'Exported {len(data["montages"])} layouts, {len(data["meshes"])} real surfaces to {OUTPUT} ({OUTPUT.stat().st_size:,} bytes).')


if __name__ == '__main__':
    main()
