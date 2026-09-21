(function () {
  "use strict";

  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var PRODUCT = currentScript.getAttribute("data-product");
  var API_URL =
    currentScript.getAttribute("data-api") ||
    new URL("/api/track", currentScript.src).toString();

  if (!PRODUCT) {
    console.error("[trackfy] atributo data-product é obrigatório no <script>");
    return;
  }

  var SESSION_KEY = "_trkfy_sid";
  var PARAMS_KEY = "_trkfy_params";
  // Além das UTMs, capturamos "ad_account" (conta de anúncio) quando presente
  // na URL, para permitir o filtro "Conta de Anúncio" no dashboard.
  var TRACKED_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "ad_account",
  ];

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    try {
      var sid = localStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = uuid();
        localStorage.setItem(SESSION_KEY, sid);
      }
      return sid;
    } catch (e) {
      // localStorage indisponível (modo privado etc). Usa um id por carregamento de página.
      return uuid();
    }
  }

  function getTrackedParams() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var hasAny = false;

    for (var i = 0; i < TRACKED_PARAMS.length; i++) {
      var key = TRACKED_PARAMS[i];
      var value = params.get(key);
      if (value) {
        found[key] = value;
        hasAny = true;
      }
    }

    try {
      if (hasAny) {
        localStorage.setItem(PARAMS_KEY, JSON.stringify(found));
        return found;
      }
      var stored = localStorage.getItem(PARAMS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      /* ignore */
    }

    return found;
  }

  var sessionId = getSessionId();

  function send(eventName, extra) {
    var tracked = getTrackedParams();
    var payload = {
      product: PRODUCT,
      event: eventName,
      session_id: sessionId,
      url: window.location.href,
      referrer: document.referrer || null,
      utm_source: tracked.utm_source || null,
      utm_medium: tracked.utm_medium || null,
      utm_campaign: tracked.utm_campaign || null,
      utm_content: tracked.utm_content || null,
      ad_account: tracked.ad_account || null,
    };

    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) {
          payload[k] = extra[k];
        }
      }
    }

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function (err) {
      console.error("[trackfy] falha ao enviar evento", eventName, err);
    });
  }

  // Dispara "click" assim que o script roda (o mais cedo possível no carregamento
  // da página) e "page_view" quando a página termina de carregar. A diferença
  // entre os dois mede quem abandonou antes da página renderizar por completo.
  send("click");

  if (document.readyState === "complete") {
    send("page_view");
  } else {
    window.addEventListener("load", function () {
      send("page_view");
    });
  }

  window.trackfy = function (eventName, opts) {
    if (eventName !== "initiate_checkout" && eventName !== "purchase") {
      console.error(
        "[trackfy] evento inválido: " + eventName + ". Use 'initiate_checkout' ou 'purchase'."
      );
      return;
    }

    opts = opts || {};
    var extra = {};

    if (eventName === "purchase") {
      extra.value = opts.value;
      // opcionais — status da venda e forma de pagamento. Sem integração com
      // o gateway de pagamento, o padrão assumido é venda paga (status
      // "paid"). Se o seu checkout sabe o status real (ex: boleto pendente),
      // passe aqui.
      if (opts.status) extra.status = opts.status; // paid | pending | refunded | chargeback
      if (opts.payment_method) extra.payment_method = opts.payment_method; // pix | card | boleto | other
      if (typeof opts.tax === "number") extra.tax = opts.tax;
    }

    send(eventName, extra);
  };
})();
