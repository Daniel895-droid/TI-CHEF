/* TI CHEF - service worker
   Quando atualizar o app, troque o número da versão abaixo (v1 -> v2...).
   Isso faz os celulares jogarem fora a cópia antiga e guardarem a nova. */
const VERSAO = "ti-chef-v1";
const FONTES = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// A página avisa qual é o endereço dela, para guardarmos já na primeira visita
self.addEventListener("message", e => {
  if (e.data && e.data.tipo === "guardar" && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(VERSAO).then(c =>
      Promise.all(e.data.urls.map(u => c.add(u).catch(() => {})))));
  }
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: usa a cópia guardada; se não tiver, busca e guarda
  if (FONTES.includes(url.hostname)) {
    e.respondWith(caches.open(VERSAO).then(async c => {
      const guardada = await c.match(req);
      if (guardada) return guardada;
      const resp = await fetch(req);
      c.put(req, resp.clone());
      return resp;
    }));
    return;
  }

  // Arquivos do próprio app: tenta a internet (pega sempre a versão nova);
  // sem internet, entrega a cópia guardada
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(VERSAO).then(c => c.put(req, copia));
        }
        return resp;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
  }
});
