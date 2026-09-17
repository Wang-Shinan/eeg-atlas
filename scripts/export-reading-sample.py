"""Export a traceable, average-referenced teaching excerpt; never invent events.
Run with the pinned MNE dependencies in scripts/requirements-atlas.txt.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import time
import urllib.request
import mne
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://physionet.org/files/eegmmidb/1.0.0/'
RECORD = 'S001/S001R02.edf'
PINNED_SHA256 = '31a95e0a880e6c3d89960d9d62c144f24cc4e9f5d7e93c7f864ef61cd49e847e'
CHANNELS = ['Fp1','Fp2','F7','F3','Fz','F4','F8','T7','C3','Cz','C4','T8','P7','P3','Pz','P4','P8','O1','O2']
START, SECONDS = 10, 12


def download(url: str) -> bytes:
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'EEG-Atlas-Teaching/1.0'})
            with urllib.request.urlopen(req, timeout=90) as response:
                return response.read()
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError('download failed')


def main() -> None:
    cache = ROOT / '.cache' / 'reading'
    cache.mkdir(parents=True, exist_ok=True)
    manifest_file = cache / 'SHA256SUMS.txt'
    if not manifest_file.exists():
        manifest_file.write_bytes(download(BASE + 'SHA256SUMS.txt'))
    expected = next(line.split()[0] for line in manifest_file.read_text().splitlines()
                    if line.split()[-1].lstrip('./*') == RECORD)
    edf = cache / 'S001R02.edf'
    if not edf.exists():
        edf.write_bytes(download(BASE + RECORD))
    source_bytes = edf.read_bytes()
    digest = hashlib.sha256(source_bytes).hexdigest()
    if digest != expected or digest != PINNED_SHA256:
        raise ValueError('EDF does not match the publisher SHA-256 manifest')
    raw = mne.io.read_raw_edf(edf, preload=True, verbose=False)
    sf = int(raw.info['sfreq'])
    if sf != 160 or len(raw.ch_names) != 64:
        raise ValueError('Unexpected recording configuration')
    by_name = {name.strip('.').upper(): name for name in raw.ch_names}
    selected = [by_name[name.upper()] for name in CHANNELS]
    # Apply the reference to ALL 64 recorded EEG signals BEFORE selecting 19.
    volts = raw.get_data(start=START * sf, stop=(START + SECONDS) * sf)
    referenced = (volts - volts.mean(axis=0, keepdims=True)) * 1e6
    values = np.round(referenced[[raw.ch_names.index(name) for name in selected]], 3)
    if values.shape != (19, 1920) or not np.isfinite(values).all():
        raise ValueError('Invalid excerpt')
    montage = mne.channels.make_standard_montage('fsaverage_1020')
    transform = mne.channels.compute_native_head_t(montage)
    native = montage.get_positions()
    head = mne.transforms.apply_trans(transform, [native['ch_pos'][name] for name in CHANNELS])
    # A declared orthographic projection, not a source estimate or an MNE spline map.
    scale = float(np.linalg.norm(head[:, :2], axis=1).max()) / 0.9
    channels = [dict(name=name, xyzHeadM=np.round(xyz, 8).tolist(),
                     xy=np.round(xyz[:2] / scale, 6).tolist())
                for name, xyz in zip(CHANNELS, head)]
    nsig = int(source_bytes[252:256])
    units = [source_bytes[256 + 96*nsig + 8*i:256 + 96*nsig + 8*(i+1)].decode('ascii').strip() for i in range(nsig)]
    prefilters = [source_bytes[256 + 136*nsig + 80*i:256 + 136*nsig + 80*(i+1)].decode('ascii').strip() for i in range(nsig)]
    info = {
        'schemaVersion': 1, 'id': 'physionet-s001r02', 'kind': 'real',
        'title': '真实记录 · S001R02 闭眼基线',
        'sampleRate': sf, 'unit': 'µV', 'duration': SECONDS, 'sourceOffset': START,
        'channels': channels, 'values': values.tolist(),
        'reference': '64 路 EEG 的离线平均参考（先作差，后选取 19 路）',
        'condition': 'R02 整次记录的实验条件为闭眼基线；本片段没有睁闭眼切换标注。',
        'provenance': {
            'dataset': 'EEG Motor Movement/Imagery Dataset v1.0.0',
            'author': 'Gerwin Schalk and colleagues; Wadsworth Center / BCI2000',
            'url': 'https://physionet.org/content/eegmmidb/1.0.0/',
            'doi': '10.13026/C28G6P', 'record': RECORD, 'sourceUrl': BASE + RECORD,
            'sourceSHA256': digest, 'publisherSHA256': expected,
            'license': 'Open Data Commons Attribution License v1.0 (ODC-By)',
            'licenseUrl': 'https://physionet.org/content/eegmmidb/view-license/1.0.0/',
            'sourceSamples': [START*sf, (START+SECONDS)*sf], 'stopExclusive': True,
            'originalChannelNames': raw.ch_names, 'selectedOriginalNames': selected,
            'edfPhysicalUnits': sorted(set(units)), 'edfPrefilters': sorted(set(prefilters)),
            'acquisitionReference': 'Not established from the supplied EDF header and dataset description; not guessed.',
            'processing': ['EDF physical calibration by MNE, output initially in volts',
                           'Subtract the mean of all 64 EEG channels at each sample',
                           'Select the fixed 19-channel subset; crop [10,22) seconds',
                           'Convert V to µV; round to 0.001 µV for JSON',
                           'No added filter, resampling, ICA, bad-channel rejection, or z-score'],
            'annotations': [dict(onset=float(o), duration=float(d), label=str(s))
                            for o, d, s in zip(raw.annotations.onset, raw.annotations.duration, raw.annotations.description)],
            'annotationNote': 'T0 denotes rest, not the time of closing the eyes. No inferred clinical labels.',
            'montage': 'fsaverage_1020; template positions, not individual digitization',
            'coordinateFrame': 'MNE head, metres; x right, y anterior, z superior',
            'nativeFrame': native['coord_frame'], 'nativeToHead': transform['trans'].tolist(),
            'mapProjection': 'orthographic head x/y; one shared scale, no source localization',
            'mneVersion': mne.__version__,
            'citations': ['Schalk et al. (2004), doi:10.1109/TBME.2004.827072',
                          'Schalk (2009), doi:10.13026/C28G6P',
                          'Pollard et al. (2026), doi:10.1038/s44360-026-00096-z']
        }
    }
    out = ROOT / 'public' / 'reading'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'real-eeg.json').write_text(json.dumps(info, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    x = values[CHANNELS.index('O1')]
    f, p = signal.welch(x, sf, window=signal.windows.hann(sf, sym=False), nperseg=sf, noverlap=sf//2, detrend='constant', scaling='density')
    ft, t, st = signal.spectrogram(x, sf, window=signal.windows.hann(sf, sym=False), nperseg=sf, noverlap=sf-20, detrend='constant', scaling='density', mode='psd')
    fixture = dict(channel='O1', frequencies=f.tolist(), psd=p.tolist(), times=t.tolist(), spectrogram=st.tolist())
    fixture['selections'] = []
    for first, last in [(0,160), (380,940), (1600,1920)]:
        _, ps = signal.welch(values[:, first:last], sf, window=signal.windows.hann(sf, sym=False), nperseg=sf, noverlap=sf//2, detrend='constant', scaling='density', axis=-1)
        fixture['selections'].append(dict(samples=[first,last], psd=ps.tolist()))
    (out / 'scipy-reference.json').write_text(json.dumps(fixture, separators=(',', ':')) + '\n')
    print(json.dumps(dict(sha256=digest, shape=values.shape, units=info['provenance']['edfPhysicalUnits'], prefilters=info['provenance']['edfPrefilters'], min=float(values.min()), max=float(values.max())), indent=2))


if __name__ == '__main__':
    main()
