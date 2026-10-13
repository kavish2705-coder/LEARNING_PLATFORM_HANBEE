/* Hanbee Notes — theme, code highlighting, copy buttons, TOC scroll-spy, reading progress. */
(function () {
  var root = document.documentElement;
  var query = new URLSearchParams(location.search);

  /* ---- embedded mode: the LMS shows a note inside an iframe, so hide our own top bar ---- */
  var embedded = query.get("embed") === "1";
  try { embedded = embedded || window.self !== window.top; } catch (e) { embedded = true; }
  if (embedded) root.classList.add("embedded");

  /* ---- theme: ?theme= wins, then saved choice, then OS preference. Parent can postMessage({type:"theme", value}) ---- */
  function savedTheme() { try { return localStorage.getItem("hanbee-notes-theme"); } catch (e) { return null; } }
  function setTheme(value, persist) {
    if (value !== "dark" && value !== "light") return;
    root.setAttribute("data-theme", value);
    if (persist) { try { localStorage.setItem("hanbee-notes-theme", value); } catch (e) {} }
  }
  var initial = query.get("theme") || savedTheme() || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(initial, false);
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "theme") setTheme(event.data.value, false);
  });
  var toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
  });

  /* ---- syntax highlighting (tiny, dependency-free) ---- */
  var words = function (s) { var o = {}; s.split(" ").forEach(function (w) { o[w] = 1; }); return o; };
  var KEYWORDS = {
    java: words("abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try var void volatile while record sealed permits yield non-sealed int long short byte char float double boolean"),
    sql: words("select from where insert into values update set delete create table alter drop primary key foreign references not null and or in join inner left right outer on group by order having limit offset as distinct count sum avg min max like between is unique default constraint index view begin commit rollback union all exists case when then else end asc desc auto_increment varchar int date timestamp"),
    js: words("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield type interface enum implements public private protected readonly as keyof infer satisfies declare namespace abstract"),
    bash: words("if then else fi for do done while case esac in function cd mkdir ls echo export sudo java javac jar mvn git npm"),
    json: {}, css: {}, hash: {}, plain: {}
  };
  var LITERALS = words("true false null undefined NaN TRUE FALSE NULL");
  var JS = { js: 1, jsx: 1 };
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function span(cls, text) { return '<span class="tk-' + cls + '">' + esc(text) + "</span>"; }

  function highlightMarkup(src) {
    var re = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w:.-]*)|(\s[\w:.-]+(?=\s*=))|("[^"]*"|'[^']*')|(\/?>)|(<%[\s\S]*?%>)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += span("com", m[1]);
      else if (m[2]) out += span("tag", m[2]);
      else if (m[3]) out += span("attr", m[3]);
      else if (m[4]) out += span("str", m[4]);
      else if (m[5]) out += span("tag", m[5]);
      else out += span("ann", m[6]);
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function highlightCode(src, lang) {
    var kw = KEYWORDS[lang === "jsx" ? "js" : lang] || {};
    var ci = lang === "sql";
    var comment = lang === "sql" ? "--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/" : lang === "bash" ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
    var tpl = JS[lang] ? "|`(?:\\\\.|[^`\\\\])*`" : "";
    var tag = lang === "jsx" ? "<\\/?[A-Za-z][\\w.]*|\\/>" : "(?!)";
    var re = new RegExp("(" + comment + ")|(\"\"\"[\\s\\S]*?\"\"\"|\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'" + tpl + ")|(@[A-Za-z_]\\w*)|(\\b\\d[\\d_]*(?:\\.\\d+)?[fFdDlL]?\\b)|(\\b[A-Za-z_$][\\w$]*\\b)|(" + tag + ")", "g");
    var out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += span("com", m[1]);
      else if (m[2]) out += span("str", m[2]);
      else if (m[3]) out += lang === "java" ? span("ann", m[3]) : esc(m[3]);
      else if (m[4]) out += span("num", m[4]);
      else if (m[6]) out += span("tag", m[6]);
      else {
        var w = m[5];
        if (kw[ci ? w.toLowerCase() : w] || LITERALS[w]) out += span("kw", w);
        else if ((lang === "java" || JS[lang]) && /^[A-Z][A-Za-z0-9_]*$/.test(w) && !/^[A-Z0-9_]+$/.test(w)) out += span("type", w);
        else out += esc(w);
      }
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  var ALIAS = { groovy: "java", html: "markup", xml: "markup", jsp: "markup", js: "js", javascript: "js", ts: "js", jsx: "jsx", tsx: "jsx", mjs: "js", css: "css", properties: "hash", yaml: "hash", dockerfile: "hash", sh: "bash", shell: "bash", cmd: "bash" };
  document.querySelectorAll("pre > code").forEach(function (code) {
    var pre = code.parentElement;
    var lang = (code.className.match(/language-(\S+)/) || [])[1] || "plain";
    var label = pre.getAttribute("data-file") || lang;
    var src = code.textContent;
    var mapped = ALIAS[lang] || lang;
    if (mapped === "markup") code.innerHTML = highlightMarkup(src);
    else if (mapped !== "plain" && mapped !== "text" && mapped !== "output") code.innerHTML = highlightCode(src, mapped);

    var wrap = document.createElement("div");
    wrap.className = "code";
    var bar = document.createElement("div");
    bar.className = "bar";
    var name = document.createElement("span");
    name.textContent = label === "text" || label === "plain" ? "diagram" : label;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(src).then(done, function () {});
    });
    bar.appendChild(name);
    bar.appendChild(btn);
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(bar);
    wrap.appendChild(pre);
  });

  /* ---- TOC: open on desktop, scroll-spy ---- */
  var toc = document.querySelector("details.toc");
  if (toc && matchMedia("(min-width: 62.01rem)").matches) toc.open = true;

  var links = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  function spy() {
    var line = window.innerHeight * 0.25, current = 0;
    targets.forEach(function (el, i) { if (el && el.getBoundingClientRect().top <= line) current = i; });
    links.forEach(function (a, i) { a.classList.toggle("active", i === current); });
  }

  /* ---- reading progress ---- */
  var bar = document.querySelector(".progress i");
  function progress() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")";
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { spy(); progress(); ticking = false; });
  }, { passive: true });
  spy(); progress();
})();
