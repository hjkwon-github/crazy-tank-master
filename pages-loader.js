/* Reassembles an Emscripten package before starting its JS runtime. */
(() => {
  'use strict';
  const config = {"parts":[{"name":"index.data.part000","size":41943040,"sha256":"4ad69ebc32e4301395ba26c5c1b31916cec80b5467b1bc27f71e3296884830e0"},{"name":"index.data.part001","size":41943040,"sha256":"e0b3d29820d4b9dc260181c90c4dd48646551c99088c7d216040c6322d82338a"},{"name":"index.data.part002","size":37737373,"sha256":"a0be26583f36247ecb741f643c4ffec139b78cc21d2f662070ed1cdce44d495f"}],"size":121623453,"sha256":"ebd0a985f58a41aa4f298db577359973dd5fdd90bcdf726d00d6dbe9c8bc92d1"};
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
