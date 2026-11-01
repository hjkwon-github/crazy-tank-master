/* Reassembles an Emscripten package before starting its JS runtime. */
(() => {
  'use strict';
  const config = {"parts":[{"name":"index.data.part000","size":25165824,"sha256":"af82d6526619c62219fd36aa142fcea12f843b7cfe19cb5f46d3776eb52c3e6d"},{"name":"index.data.part001","size":25165824,"sha256":"e448f59e44dc6a7098918bb3b40947353cba9892514ea80f676a3b20bb8e6df1"},{"name":"index.data.part002","size":18234219,"sha256":"c79394eeffa7e5c0dc1ff3b27e8179611b3ee694a2ece00e651d7de0fff6327e"}],"size":68565867,"sha256":"f3335e47f89066a9797e203214ae13affca7f3db5ead0b5107c207d66e5464c4"};
  const base = new URL('.', document.currentScript.src);
  const status = document.getElementById('status');
  const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  async function digest(buffer) {
    if (!globalThis.crypto?.subtle) throw new Error('HTTPS 환경에서 실행해 주세요.');
    return hex(await crypto.subtle.digest('SHA-256', buffer));
  }
  async function start() {
    const all = new Uint8Array(config.size);
    let offset = 0;
    for (let i = 0; i < config.parts.length; i++) {
      const part = config.parts[i];
      status.textContent = `게임 리소스 불러오는 중 (${i + 1}/${config.parts.length})`;
      const response = await fetch(new URL(part.name, base));
      if (!response.ok) throw new Error(`리소스 다운로드 실패 (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== part.size || await digest(bytes) !== part.sha256)
        throw new Error('게임 리소스가 손상되었습니다.');
      all.set(new Uint8Array(bytes), offset);
      offset += bytes.byteLength;
    }
    if (offset !== config.size || await digest(all.buffer) !== config.sha256)
      throw new Error('게임 리소스를 확인하지 못했습니다.');
    Module.getPreloadedPackage = (name, expected) => {
      if (!name.endsWith('index.data') || expected !== all.byteLength)
        throw new Error('게임 데이터 크기가 빌드와 일치하지 않습니다.');
      return all.buffer;
    };
    const script = document.createElement('script');
    script.src = new URL('index.js', base).href;
    script.onerror = () => { status.textContent = '게임 실행 파일을 불러오지 못했습니다.'; };
    document.body.appendChild(script);
  }
  start().catch(error => {
    console.error('Game resource load failed:', error);
    status.textContent = `게임을 불러오지 못했습니다. ${error.message}`;
  });
})();
