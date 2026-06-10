var content=(function(){function e(e){return e}function t(e,t){let r=new URL(t),i=Array.from(e.querySelectorAll(`h1,h2,h3`)).slice(0,80).map(e=>({level:Number(e.tagName.slice(1)),text:n(e.textContent??``)})).filter(e=>e.text.length>0),a=e.getSelection()?.toString(),o=e.body,s=n(o&&(o.innerText||o.textContent)||``);return{url:t,title:e.title||r.hostname,domain:r.hostname,captured_at:new Date().toISOString(),headings:i,selected_text:a?n(a):void 0,visible_text:s.slice(0,24e3),cleaned_text:s.slice(0,24e3)}}function n(e){return e.replace(/\s+/g,` `).trim()}var r=.8;function i(e,t){let n=t<440?Math.max(320,Math.min(t,440)):440,i=Math.max(n,Math.floor(t*r));return Math.min(Math.max(Math.round(e),n),i)}function a(e,t,n=`push`){if(t<900)return`overlay`;let r=e/t;return n===`overlay`?r<.48?`push`:`overlay`:r>.52?`overlay`:`push`}function o(e){let t=e.split(`

`),n=t.pop()??``,r=[];for(let e of t){let t=e.split(`
`).find(e=>e.startsWith(`data:`));if(t)try{r.push(JSON.parse(t.slice(5).trim()))}catch{}}return{events:r,remainder:n}}var s=`http://127.0.0.1:17861`,c=`navia_last_session_id`;async function ee(){return!!(await m({path:`/v1/health`})).ok}async function l(e){let t=(await m({path:`/v1/sessions`,method:`POST`,headers:{"Content-Type":`application/json`},body:{client:`chrome-extension`,metadata:{source:e}}})).data.session_id;return await chrome.storage.local.set({[c]:t}),t}async function u(){let e=(await chrome.storage.local.get(c))[c];return typeof e==`string`&&e.startsWith(`sess_`)?e:null}async function d(){await chrome.storage.local.remove(c)}async function f(e){let t=await m({path:`/v1/sessions/${e}`});return t.ok?t.data:(await d(),null)}async function te(e,t){let n=await m({path:`/v1/page/context`,method:`POST`,headers:{"Content-Type":`application/json`},body:{...e,session_id:t}});return n.ok?(await chrome.storage.local.set({[c]:t}),{ok:!0,pageId:n.data.page_id,structuredPage:n.data.structuredPage}):{ok:!1,message:n.error?.message??`PageContext submit failed.`}}async function ne(e,t,n){let r={path:`/v1/chat/stream`,method:`POST`,headers:{"Content-Type":`application/json`},body:{session_id:e,message:t,source:`typed`,request_id:`req_${crypto.randomUUID().replace(/-/g,``)}`}};if(h())return g(r,n);let i=await fetch(`${s}/v1/chat/stream`,{method:r.method,headers:r.headers,body:JSON.stringify(r.body)});if(!i.body)throw Error(`SSE response body is empty.`);await p(i.body,n)}function re(e){let t=new Map((e.artifacts??[]).map(e=>[e.turnId,e]));return(e.messages??[]).filter(e=>e.role===`user`||e.role===`assistant`||e.role===`system`).map(e=>({id:e.message_id,role:e.role,text:e.content,turnId:e.turn_id,artifact:e.turn_id?t.get(e.turn_id):void 0}))}async function p(e,t){let n=e.getReader(),r=new TextDecoder,i=``;for(;;){let{value:e,done:a}=await n.read();if(a)break;i+=r.decode(e,{stream:!0});let s=o(i);i=s.remainder;for(let e of s.events)t(e)}}async function m(e){if(h()){let t=await chrome.runtime.sendMessage({type:`navia.runtimeFetch`,request:e});if(!t.ok||!t.response)throw Error(t.error??`Runtime proxy failed.`);return t.response.body}return await(await fetch(`${s}${e.path}`,{method:e.method??`GET`,headers:e.headers,body:e.body===void 0?void 0:JSON.stringify(e.body)})).json()}function h(){return typeof chrome<`u`&&!!chrome.runtime?.sendMessage&&window.location.protocol!==`chrome-extension:`}async function g(e,t){let n=chrome.runtime.connect({name:`navia.runtimeStream`}),r=``;return new Promise((i,a)=>{n.onMessage.addListener(e=>{if(e?.type===`chunk`&&typeof e.text==`string`){r+=e.text;let n=o(r);r=n.remainder;for(let e of n.events)t(e);return}if(e?.type===`done`){n.disconnect(),i();return}e?.type===`error`&&(n.disconnect(),a(Error(String(e.message??`Runtime stream proxy failed.`))))}),n.postMessage({type:`navia.runtimeStream`,request:e})})}var _=`navia-injected-host`,ie=440,v=`mermaid-renderer.html`;function y(e,t,n=`push`){return a(e,t,n)}function b(e,t){return i(e,t)}function x(){return typeof chrome<`u`&&chrome.runtime?.getURL?chrome.runtime.getURL(v):v}function ae(e,t=x()){let n=document.createElement(`div`);n.className=`navia-artifact navia-artifact-viewer`,n.dataset.rendered=`pending`,n.dataset.artifactId=e.artifactId;let r=document.createElement(`iframe`);r.className=`navia-mermaid-frame`,r.title=`Mermaid mindmap`,r.src=t,r.addEventListener(`load`,()=>{r.contentWindow?.postMessage({type:`navia.renderMermaid`,artifactId:e.artifactId,source:e.content},`*`)}),n.append(r);let i=t=>{if(r.contentWindow&&t.source&&t.source!==r.contentWindow)return;let a=t.data;if(!(a.type!==`navia.mermaidRendered`||a.artifactId!==e.artifactId)){if(n.dataset.rendered=a.status===`succeeded`?`true`:`false`,a.status!==`succeeded`){let e=a.message??`Mermaid render failed`;n.title=e;let t=document.createElement(`p`);t.className=`navia-mermaid-error`,t.textContent=e,n.append(t)}window.removeEventListener(`message`,i)}};return window.addEventListener(`message`,i),n}function S(){if(document.getElementById(_)||!/^https?:|^file:/.test(window.location.href))return null;let e=document.createElement(`div`);e.id=_,document.documentElement.appendChild(e);let n=e.attachShadow({mode:`open`}),r={open:!1,side:`right`,width:b(ie,window.innerWidth),activeTool:`chat`,runtimeStatus:`checking`,sessionId:null,pageContext:null,structuredPageDebug:null,pageSubmitted:!1,statusText:`正在检查 Runtime...`,streamStatus:`idle`,lastError:null},i=[{id:w(),role:`system`,text:`展开后读取当前页面，即可开始网页伴读。`}],a=new Map,o=`push`,s=null;n.innerHTML=`${ce()}${se()}`;let c=n.querySelector(`[data-testid='navia-frame']`),p=n.querySelector(`[data-testid='navia-ball']`),m=n.querySelector(`[data-testid='navia-hover-strip']`);n.querySelector(`[data-testid='navia-panel']`);let h=n.querySelector(`[data-testid='navia-resize-handle']`),g=n.querySelector(`[data-testid='navia-reconnect']`),v=n.querySelector(`[data-testid='navia-collapse']`),x=n.querySelector(`[data-testid='navia-debug-reconnect']`),S=n.querySelector(`[data-testid='navia-tool-chat']`),T=n.querySelector(`[data-testid='navia-debug-toggle']`),E=n.querySelector(`[data-testid='navia-read-page']`),D=n.querySelector(`[data-testid='navia-debug-read-page']`),O=n.querySelector(`[data-testid='navia-summary']`),k=n.querySelector(`[data-testid='navia-debug-summary']`),A=n.querySelector(`[data-testid='navia-mindmap']`),j=n.querySelector(`[data-testid='navia-debug-mindmap']`),M=n.querySelector(`[data-testid='navia-new-chat']`),N=n.querySelector(`[data-testid='navia-send']`),P=n.querySelector(`[data-testid='navia-input']`),F=n.querySelector(`[data-testid='navia-messages']`),I=n.querySelector(`[data-testid='navia-status']`),L=n.querySelector(`[data-testid='navia-page']`),R=n.querySelector(`[data-testid='navia-state-banner']`),z=n.querySelector(`[data-testid='navia-chat-notice']`),B=n.querySelector(`[data-testid='navia-structured-json']`);p.addEventListener(`click`,()=>H()),m.addEventListener(`click`,()=>H()),g.addEventListener(`click`,()=>G()),v.addEventListener(`click`,()=>U()),x.addEventListener(`click`,()=>G()),T.addEventListener(`click`,()=>W(r.activeTool===`debug`?`chat`:`debug`)),E.addEventListener(`click`,()=>q()),D.addEventListener(`click`,()=>q()),O.addEventListener(`click`,()=>J(`总结这篇文章`)),k.addEventListener(`click`,()=>J(`总结这篇文章`)),A.addEventListener(`click`,()=>J(`生成 Mermaid 思维导图`)),j.addEventListener(`click`,()=>J(`生成 Mermaid 思维导图`)),M.addEventListener(`click`,()=>le()),N.addEventListener(`click`,()=>J(P.value));let V=()=>{let e=Math.max(44,P.value.split(`
`).length*22+24);P.style.height=`auto`,P.style.height=`${Math.min(Math.max(P.scrollHeight,e),120)}px`};return P.addEventListener(`input`,V),V(),P.addEventListener(`keydown`,e=>{(e.metaKey||e.ctrlKey)&&e.key===`Enter`&&(e.preventDefault(),J(P.value))}),fe(),window.addEventListener(`resize`,()=>{r.width=b(r.width,window.innerWidth),Z()}),G(),Z(),{open:H,close:U};function H(){if(r.open=!0,Z(),r.runtimeStatus===`online`&&!r.pageSubmitted){q();return}r.runtimeStatus!==`online`&&G().then(()=>{r.runtimeStatus===`online`&&!r.pageSubmitted&&q()})}function U(){r.open=!1,$(),Z()}function W(e){r.activeTool=e,Z()}async function le(){r.sessionId=null,r.pageContext=null,r.structuredPageDebug=null,r.pageSubmitted=!1,r.streamStatus=`idle`,r.lastError=null,r.statusText=r.runtimeStatus===`online`?`已新建会话`:r.statusText,i.splice(0,i.length,{id:w(),role:`system`,text:`新会话已创建。读取当前页面后即可继续网页伴读。`}),P.value=``,V(),r.runtimeStatus===`online`&&(r.sessionId=await l(`injected-panel`)),Z()}async function G(){r.runtimeStatus=`checking`,r.statusText=`正在检查 Runtime...`,r.lastError=null,Z();try{let e=await ee();r.runtimeStatus=e?`online`:`offline`,r.statusText=e?`Runtime online`:`Runtime offline`,e&&await ue()}catch{r.runtimeStatus=`offline`,r.statusText=`Runtime offline，请启动本地服务`,r.lastError=`Local Runtime 未连接，启动后点击重连。`}Z()}async function K(){if(r.sessionId)return r.sessionId;let e=await l(`injected-panel`);return r.sessionId=e,e}async function ue(){let e=await u();if(e)try{let t=await f(e);if(!t)return;if(t.activePage&&!oe(t.activePage.url,window.location.href)){await d(),r.sessionId=null,r.pageContext=null,r.pageSubmitted=!1,r.statusText=`最近 session 与当前页面不匹配，请重新读取页面。`;return}r.sessionId=t.session_id,t.activePage&&(r.pageContext={url:t.activePage.url,title:t.activePage.title,domain:t.activePage.domain,captured_at:t.activePage.captured_at??new Date().toISOString(),headings:[],visible_text:``,cleaned_text:``},r.pageSubmitted=!0,r.statusText=`已恢复：${t.activePage.title}`);let n=re(t);n.length>0&&i.splice(0,i.length,...n)}catch{r.statusText=`最近 session 恢复失败`}}async function q(){if(r.runtimeStatus!==`online`){r.statusText=`Runtime offline，无法提交页面上下文`,r.lastError=`Runtime offline，无法读取并提交当前页面。`,Z();return}r.statusText=`正在读取当前页面...`,r.lastError=null,Z();try{let e=t(document,window.location.href);r.pageContext=e;let n=await te(e,await K());r.pageSubmitted=n.ok,r.structuredPageDebug=n.structuredPage??null,r.statusText=n.ok?`已提交页面：${e.title}`:n.message??`页面上下文提交失败`}catch(e){r.pageSubmitted=!1,r.statusText=`读取失败：${e instanceof Error?e.message:`unknown error`}`,r.lastError=e instanceof Error?e.message:`PageContext 读取失败。`}Z()}async function J(e){let t=e.trim();if(!t)return;if(r.runtimeStatus!==`online`){Y(`system`,`Runtime offline，请启动 Local Runtime 后重试。`),r.lastError=`Runtime offline，无法发送消息。`,Z();return}if(!r.pageSubmitted){Y(`system`,`请先读取当前页面。`),r.lastError=`缺少当前页面上下文，不能生成摘要或回答。`,Z();return}let n=await K(),a=w();i.push({id:w(),role:`user`,text:t}),i.push({id:a,role:`assistant`,text:``}),P.value=``,r.streamStatus=`streaming`,r.lastError=null,Z();try{await ne(n,t,e=>de(e,a)),r.streamStatus=`done`}catch(e){r.runtimeStatus=`offline`,r.streamStatus=`error`,r.lastError=`连接 Runtime 失败：${e instanceof Error?e.message:`unknown error`}`,X(a,r.lastError)}Z()}function de(e,t){switch(e.type){case`response.delta`:X(t,String(e.data.text??``));return;case`artifact.created`:X(t,``,e.data.artifact);return;case`tool.started`:r.streamStatus=`running ${String(e.data.tool_name??`tool`)}`,Z();return;case`tool.done`:r.streamStatus=`tool done`,Z();return;case`error`:r.lastError=String(e.data.message??e.data.code??`Runtime error`),X(t,`\n${r.lastError}`),r.streamStatus=`error`,Z();return;default:return}}function Y(e,t){i.push({id:w(),role:e,text:t}),Z()}function X(e,t,n){let r=i.find(t=>t.id===e);r&&(t&&(r.text+=t),n&&(r.artifact=n),Z())}function fe(){let e=!1;h.addEventListener(`pointerdown`,t=>{e=!0,h.setPointerCapture(t.pointerId),t.preventDefault()}),h.addEventListener(`pointermove`,t=>{e&&(r.width=b(r.side===`right`?window.innerWidth-t.clientX:t.clientX,window.innerWidth),Z())}),h.addEventListener(`pointerup`,()=>{e=!1})}function Z(){c.dataset.open=String(r.open),c.dataset.side=r.side,c.style.setProperty(`--navia-width`,`${r.width}px`),o=y(r.width,window.innerWidth,o),c.dataset.mode=o,c.dataset.widthState=C(r.width,window.innerWidth,o),c.dataset.runtime=r.runtimeStatus,c.dataset.submitted=String(r.pageSubmitted),c.dataset.pageState=r.pageSubmitted?`submitted`:`missing`,c.dataset.stream=r.streamStatus,c.dataset.error=r.lastError?`true`:`false`,c.dataset.activeTool=r.activeTool,I.textContent=`${r.statusText} · ${r.streamStatus}`,L.textContent=r.pageContext?`${r.pageContext.title} · ${r.pageContext.domain} · headings ${r.pageContext.headings.length}`:`尚未读取页面`,B.textContent=JSON.stringify(he(),null,2),R.textContent=pe(),z.textContent=me(),S.classList.toggle(`active`,r.activeTool===`chat`),S.setAttribute(`aria-current`,r.activeTool===`chat`?`true`:`false`),T.setAttribute(`aria-pressed`,r.activeTool===`debug`?`true`:`false`),T.classList.toggle(`active`,r.activeTool===`debug`),n.querySelector(`[data-testid='navia-debug-pane']`)?.classList.toggle(`is-visible`,r.activeTool===`debug`),O.disabled=!Q(),k.disabled=!Q(),A.disabled=!Q(),j.disabled=!Q(),N.disabled=!Q();let e=F.scrollHeight-F.scrollTop-F.clientHeight<24;F.innerHTML=``;for(let e of i){let t=document.createElement(`article`);t.className=`navia-message ${e.role}`;let n=document.createElement(`pre`);n.textContent=e.text||(e.role===`assistant`?`...`:``),t.appendChild(n),F.appendChild(t),e.artifact?.metadata?.format===`mermaid`&&_e(e.artifact,t)}e&&(F.scrollTop=F.scrollHeight),r.open&&o===`push`&&ge(),(!r.open||o===`overlay`)&&$()}function Q(){return r.runtimeStatus===`online`&&r.pageSubmitted&&r.streamStatus!==`streaming`}function pe(){return r.lastError?r.lastError:r.runtimeStatus===`offline`?`Runtime offline，请启动本地服务后点击重连。`:r.runtimeStatus===`checking`?`正在检查 Local Runtime 状态。`:r.pageSubmitted?r.streamStatus===`streaming`?`正在生成回复，请稍候。`:r.streamStatus.startsWith(`running`)?`工具执行中：${r.streamStatus.replace(`running `,``)}`:r.statusText.startsWith(`已恢复`)?`已恢复最近会话，可继续基于当前页面提问。`:`当前页面已就绪，可进行摘要和问答。`:`尚未读取当前页面，摘要和问答会保持禁用。`}function me(){return r.runtimeStatus===`offline`?`Runtime offline，启动本地服务后可继续聊天。`:r.runtimeStatus===`checking`?`正在检查 Local Runtime。`:r.pageSubmitted?r.streamStatus===`streaming`?`正在生成回复。`:r.streamStatus.startsWith(`running`)?`正在执行工具：${r.streamStatus.replace(`running `,``)}`:`当前页面已就绪。`:`读取当前页面后，聊天会基于网页内容回答。`}function he(){return r.structuredPageDebug?r.structuredPageDebug:{status:`missing`,message:`读取当前页面后，这里会显示 A 模块返回的 StructuredPageContext。`,expectedSignals:[`pageId`,`contentHash`,`metadata`,`headingTree`,`paragraphs`,`chunks`,`annotations`,`summaryDraft`]}}function ge(){if(!s){let e=document.documentElement,t={marginLeft:e.style.marginLeft,marginRight:e.style.marginRight,transition:e.style.transition};s=()=>{e.style.marginLeft=t.marginLeft,e.style.marginRight=t.marginRight,e.style.transition=t.transition,s=null}}let e=document.documentElement;e.style.transition=`margin 220ms ease`,r.side===`right`?(e.style.marginRight=`${r.width}px`,e.style.marginLeft=``):(e.style.marginLeft=`${r.width}px`,e.style.marginRight=``)}function $(){s&&s()}function _e(e,t){let n=a.get(e.artifactId);if(n&&n.content===e.content){t.appendChild(n.element);return}let r=ae(e);a.set(e.artifactId,{content:e.content,element:r}),t.appendChild(r)}}function C(e,t,n){return t<900?`mobile`:n===`overlay`?`overlay`:e/t>=.48?`half`:`narrow`}function w(){return`ui_${crypto.randomUUID().replace(/-/g,``)}`}function oe(e,t){try{let n=new URL(e),r=new URL(t);return n.hash=``,r.hash=``,n.toString()===r.toString()}catch{return e===t}}function se(){return`
    <section class="navia-frame" data-testid="navia-frame" data-open="false" data-side="right" data-mode="push">
      <button class="navia-launcher-ball" data-testid="navia-ball" type="button" aria-label="打开 Navia">
        <span>N</span>
      </button>
      <button class="navia-hover-strip" data-testid="navia-hover-strip" type="button" aria-label="打开 Navia 聊天">
        <span>⌘</span>
        <strong>Ask AI</strong>
        <em>AI</em>
      </button>
      <aside class="navia-panel navia-panel-shell" data-testid="navia-panel" aria-label="Navia assistant">
        <div class="navia-resize" data-testid="navia-resize-handle" role="separator" aria-orientation="vertical"></div>
        <main class="navia-workspace navia-chat-workspace">
          <section class="navia-pane navia-chat-pane" data-testid="navia-chat-pane" aria-label="Chat">
            <header class="navia-chat-header">
              <div class="navia-chat-title" data-testid="navia-chat-title">
                <div class="navia-avatar" aria-label="Navia">N</div>
                <div class="navia-chat-title-copy">
                  <strong>聊天</strong>
                  <span data-testid="navia-status"></span>
                </div>
                <span class="navia-dot" aria-hidden="true"></span>
              </div>
              <div class="navia-chat-header-actions">
                <button data-testid="navia-reconnect" class="navia-reconnect-button" type="button">重连</button>
                <button data-testid="navia-collapse" class="navia-icon-button" type="button" aria-label="收起 Navia">‹</button>
              </div>
            </header>
            <section class="navia-messages" data-testid="navia-messages" aria-live="polite"></section>
            <footer class="navia-chat-footer">
              <p class="navia-chat-notice" data-testid="navia-chat-notice" role="status"></p>
              <div class="navia-chat-toolbar" aria-label="Chat actions">
                <button data-testid="navia-read-page">读取网页</button>
                <button data-testid="navia-summary">总结</button>
                <button data-testid="navia-mindmap">Mindmap</button>
                <button data-testid="navia-new-chat">新对话</button>
              </div>
              <div class="navia-composer-container" data-testid="navia-composer-container">
                <div class="navia-composer">
                  <textarea data-testid="navia-input" placeholder="基于当前网页提问..."></textarea>
                  <button data-testid="navia-send">发送</button>
                </div>
              </div>
            </footer>
          </section>
          <section class="navia-pane navia-debug-pane" data-testid="navia-debug-pane" aria-label="Debug">
            <header class="navia-header">
              <div>
                <strong>Debug</strong>
                <span>运行状态与页面上下文</span>
              </div>
              <button data-testid="navia-debug-reconnect">重连</button>
            </header>
            <div class="navia-page" data-testid="navia-page"></div>
            <div class="navia-state-banner" data-testid="navia-state-banner" role="status"></div>
            <section class="navia-debug-json-card" aria-label="A module structured extraction">
              <header>
                <strong>A 模块结构化提取</strong>
                <span>StructuredPageContext JSON</span>
              </header>
              <pre data-testid="navia-structured-json"></pre>
            </section>
            <div class="navia-actions">
              <button data-testid="navia-debug-read-page">读取当前页面</button>
              <button data-testid="navia-debug-summary">总结</button>
              <button data-testid="navia-debug-mindmap">Mindmap</button>
            </div>
          </section>
        </main>
        <nav class="navia-tool-dock" aria-label="Navia tools">
          <button class="navia-tool-button active" data-testid="navia-tool-chat" type="button" aria-current="true" aria-label="聊天">聊天</button>
          <button class="navia-tool-button" data-testid="navia-debug-toggle" type="button" aria-pressed="false" aria-label="切换 Debug">⚙</button>
        </nav>
      </aside>
    </section>
  `}function ce(){return`
    <style>
      :host { all: initial; }
      .navia-frame {
        --navia-width: 440px;
        --navia-width-max: 80vw;
        --navia-mobile-rail-width: 56px;
        --navia-resize-hit-width: 8px;
        --navia-panel-padding: 14px;
        --navia-gap-sm: 8px;
        --navia-gap-md: 10px;
        --navia-gap-lg: 16px;
        --navia-text: #172033;
        --navia-text-muted: #52606d;
        --navia-brand: #635bff;
        --navia-brand-strong: #5146f4;
        --navia-brand-soft: #f4f6ff;
        --navia-surface: #ffffff;
        --navia-shell: #ffffff;
        --navia-tool-bg: #ffffff;
        --navia-border: #e5e7eb;
        --navia-border-strong: #b7b9ff;
        --navia-success: #2f9e44;
        --navia-error: #dc2626;
        --navia-warning: #d97706;
        --navia-warning-bg: #fff7ed;
        --navia-error-bg: #fef2f2;
        --navia-info-bg: #eef2ff;
        --navia-user-bg: #eef2ff;
        --navia-system-bg: #f1f5f9;
        --navia-radius-sm: 7px;
        --navia-radius-md: 8px;
        --navia-radius-pill: 999px;
        --navia-shadow-ball: 0 12px 28px rgba(15, 23, 42, 0.22);
        --navia-shadow-panel: 0 12px 48px rgba(0, 0, 0, 0.08);
        --navia-shadow-overlay: 0 0 0 9999px rgba(15, 23, 42, 0.08), 0 0 36px rgba(15, 23, 42, 0.2);
        --navia-shadow-hover: 0 14px 28px rgba(15, 23, 42, 0.16);
        --navia-motion-fast: 160ms ease;
        --navia-motion-panel: 220ms ease;
        --navia-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--navia-text);
        font-family: var(--navia-font);
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
      }
      .navia-panel { pointer-events: auto; }
      .navia-launcher-ball,
      .navia-hover-strip {
        pointer-events: auto;
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        border: 1px solid #d8ddff;
        background: #ffffff;
        color: var(--navia-brand);
        box-shadow: var(--navia-shadow-ball);
        z-index: 2147483647;
      }
      .navia-launcher-ball {
        width: 58px;
        height: 70px;
        border-right: 0;
        border-top-left-radius: 999px;
        border-bottom-left-radius: 999px;
        padding: 0 0 0 7px;
      }
      .navia-launcher-ball span {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 999px;
        background: var(--navia-brand);
        color: #fff;
        font: 800 18px/1 var(--navia-font);
      }
      .navia-hover-strip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        height: 58px;
        min-width: 190px;
        border-radius: 999px;
        padding: 6px 12px 6px 18px;
        opacity: 0;
        visibility: hidden;
        transform: translate(18px, -50%);
        transition: opacity var(--navia-motion-fast), transform var(--navia-motion-fast), visibility var(--navia-motion-fast);
      }
      .navia-hover-strip span {
        color: #8791a5;
        font: 700 20px/1 var(--navia-font);
      }
      .navia-hover-strip strong {
        color: #263247;
        font: 700 18px/1 var(--navia-font);
        white-space: nowrap;
      }
      .navia-hover-strip em {
        display: grid;
        place-items: center;
        width: 46px;
        height: 46px;
        border-radius: 999px;
        background: var(--navia-brand);
        color: #fff;
        font: 800 16px/1 var(--navia-font);
        font-style: normal;
      }
      .navia-frame:not([data-open="true"]) .navia-launcher-ball:hover + .navia-hover-strip,
      .navia-frame:not([data-open="true"]) .navia-hover-strip:hover,
      .navia-frame:not([data-open="true"]) .navia-hover-strip:focus-visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(-50%);
      }
      .navia-frame[data-open="true"] .navia-launcher-ball,
      .navia-frame[data-open="true"] .navia-hover-strip {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .navia-panel {
        position: fixed;
        top: 0;
        bottom: 0;
        box-sizing: border-box;
        width: var(--navia-width);
        max-width: var(--navia-width-max);
        min-width: 440px;
        display: flex;
        flex-direction: column;
        background: var(--navia-shell);
        border: none;
        box-shadow: var(--navia-shadow-panel);
        transform: translateX(100%);
        transition: transform var(--navia-motion-panel);
      }
      .navia-frame[data-side="right"] .navia-panel { right: 0; transform: translateX(100%); }
      .navia-frame[data-side="left"] .navia-panel { left: 0; transform: translateX(-100%); }
      .navia-frame[data-open="true"] .navia-panel { transform: translateX(0); }
      .navia-resize {
        position: absolute;
        top: 0;
        bottom: 0;
        width: var(--navia-resize-hit-width);
        cursor: ew-resize;
        background: transparent;
      }
      .navia-frame[data-side="right"] .navia-resize { left: -4px; }
      .navia-frame[data-side="left"] .navia-resize { right: -4px; }
      .navia-chat-workspace {
        min-width: 0;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        padding: 12px 12px 12px 14px;
      }
      .navia-avatar {
        display: none;
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: var(--navia-radius-pill);
        background: var(--navia-brand);
        color: white;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        flex: none;
      }
      .navia-dot { width: 8px; height: 8px; border-radius: var(--navia-radius-pill); background: var(--navia-success); flex: none; }
      .navia-frame[data-runtime="offline"] .navia-dot { background: var(--navia-error); }
      .navia-frame[data-runtime="checking"] .navia-dot { background: #f59e0b; }
      .navia-pane {
        min-width: 0;
        min-height: 0;
        height: 100%;
        display: grid;
      }
      .navia-frame[data-active-tool="debug"] .navia-debug-pane,
      .navia-debug-pane.is-visible {
        display: grid;
        grid-template-rows: auto auto auto auto minmax(0, 1fr);
        gap: var(--navia-gap-md);
      }
      .navia-chat-pane {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        gap: var(--navia-gap-md);
      }
      .navia-chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 0 0;
      }
      .navia-chat-title {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .navia-chat-title-copy {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      .navia-chat-header strong { display: block; font-size: 16px; }
      .navia-chat-header span { display: block; color: var(--navia-text-muted); font-size: 12px; }
      .navia-chat-header-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .navia-reconnect-button {
        border: 1px solid #e5e7eb;
        background: #fff;
        color: var(--navia-text-muted);
        padding: 6px 10px;
        border-radius: 999px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
      }
      .navia-icon-button {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        padding: 0;
        border-radius: 999px;
        color: var(--navia-text-muted);
        font: 700 18px/1 var(--navia-font);
      }
      .navia-reconnect-button:hover:not(:disabled) {
        background: #f9fafb;
        color: var(--navia-text);
      }
      .navia-icon-button:hover:not(:disabled) {
        background: #f9fafb;
        color: var(--navia-text);
      }
      .navia-chat-notice {
        display: block;
        min-height: 16px;
        margin: 0;
        color: var(--navia-text-muted);
        font: 12px/1.35 var(--navia-font);
      }
      .navia-frame[data-runtime="offline"] .navia-chat-notice,
      .navia-frame[data-error="true"] .navia-chat-notice,
      .navia-frame[data-page-state="missing"][data-runtime="online"] .navia-chat-notice {
        color: var(--navia-warning);
      }
      .navia-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .navia-header strong { display: block; font-size: 16px; }
      .navia-header span { display: block; color: var(--navia-text-muted); font-size: 12px; margin-top: 4px; }
      .navia-page {
        display: none;
      }
      .navia-state-banner {
        display: none;
      }
      .navia-debug-json-card {
        display: none;
      }
      .navia-chat-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;
        border-top: 1px solid #e5e7eb;
        background: #fff;
        padding: 12px 0 0;
      }
      .navia-chat-footer:focus-within {
        border-color: var(--navia-brand);
        box-shadow: 0 0 0 2px rgba(99, 91, 255, 0.08);
      }
      .navia-chat-toolbar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
      }
      button {
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        background: #fff;
        color: var(--navia-text);
        font: 500 13px/1.2 var(--navia-font);
        padding: 8px 12px;
        cursor: pointer;
      }
      .navia-chat-toolbar button:hover:not(:disabled) {
        background: #f9fafb;
      }
      button:disabled { color: #9aa6b2; cursor: not-allowed; }
      .navia-messages {
        position: relative;
        z-index: 1;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: var(--navia-gap-md);
        padding-right: 4px;
      }
      .navia-message {
        border-radius: 12px;
        padding: 10px;
        background: #fff;
        border: 1px solid #f3f4f6;
        min-width: 0;
        max-width: 100%;
      }
      .navia-message.user { background: #f4f6ff; border: none; color: #172033; }
      .navia-message.assistant {
        background: #ffffff;
        border: 1px solid #f3f4f6;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
      }
      .navia-message.system {
        background: #ffffff;
        border: 1px solid #f3f4f6;
        opacity: 0.9;
      }
      .navia-frame[data-stream="error"] .navia-message.assistant:last-child {
        border-color: #fecaca;
        background: var(--navia-error-bg);
      }
      .navia-message pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        font: 13px/1.45 var(--navia-font);
      }
      .navia-artifact {
        --navia-artifact-viewer: true;
        margin-top: 10px;
        max-width: 100%;
        overflow: auto;
      }
      .navia-mermaid-frame {
        width: 100%;
        height: 280px;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-md);
        background: var(--navia-surface);
      }
      .navia-mermaid-source {
        margin-top: 8px;
        color: var(--navia-text-muted);
      }
      .navia-mermaid-source summary {
        cursor: pointer;
        font-size: 12px;
      }
      .navia-mermaid-error {
        margin: 8px 0 0;
        color: #b91c1c;
        font-size: 12px;
      }
      .navia-composer-container {
        position: relative;
      }
      .navia-composer {
        position: relative;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        min-width: 0;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 8px 12px;
      }
      .navia-composer textarea {
        box-sizing: border-box;
        display: block;
        min-width: 0;
        width: 100%;
        min-height: 44px;
        resize: none;
        border: none;
        border-radius: 0;
        padding: 0;
        background: transparent;
        font: 13px/1.4 var(--navia-font);
        outline: none;
        overflow: hidden;
      }
      .navia-composer:focus-within textarea {
        background: transparent;
      }
      .navia-composer button {
        position: static;
        flex: none;
        border: none;
        border-radius: 8px;
        background: var(--navia-brand);
        color: #fff;
        padding: 6px 16px;
        box-shadow: none;
      }
      .navia-composer button:hover:not(:disabled) {
        background: var(--navia-brand-strong);
      }
      .navia-tool-dock {
        position: absolute;
        top: 50%;
        right: 0;
        transform: translate(100%, -50%);
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 60px;
        padding: 10px 8px;
        border-left: 1px solid #e5e7eb;
        border-top-right-radius: 16px;
        border-bottom-right-radius: 16px;
        background: #f8f9ff;
        box-shadow: 8px 0 24px rgba(15, 23, 42, 0.04);
        backdrop-filter: blur(10px);
      }
      .navia-tool-button {
        width: 100%;
        min-height: 36px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fff;
        padding: 0 8px;
        color: var(--navia-text-muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
      }
      .navia-tool-button.active {
        background: #f4f6ff;
        border-color: #dbe2ff;
        color: var(--navia-brand-strong);
        box-shadow: 0 4px 12px rgba(99, 91, 255, 0.12);
      }
      .navia-tool-button:hover:not(:disabled) {
        background: #f9fafb;
      }
      .navia-frame[data-mode="overlay"] .navia-panel { box-shadow: var(--navia-shadow-overlay); }
      @media (max-width: 899px) {
        .navia-frame { --navia-width: 100vw; }
        .navia-panel {
          min-width: 0;
          width: min(100vw, max(320px, var(--navia-width)));
          max-width: 100vw;
          display: flex;
        }
        .navia-workspace { padding: 10px; }
        .navia-chat-header {
          align-items: flex-start;
          flex-direction: column;
        }
        .navia-chat-header-actions {
          width: 100%;
          justify-content: space-between;
        }
        .navia-composer button {
          padding-inline: 12px;
        }
        .navia-tool-dock {
          top: auto;
          right: 0;
          bottom: 12px;
          transform: translate(100%, 0);
          flex-direction: row;
          width: auto;
          border-radius: 14px;
        }
      }
    </style>
  `}var T=e({matches:[`<all_urls>`],main(){S(),chrome.runtime.onMessage.addListener((e,n,r)=>e?.type===`navia.extractPageContext`?(r({ok:!0,context:t(document,window.location.href)}),!0):!1)}}),E={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)},D=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,O=class e extends Event{static EVENT_NAME=k(`wxt:locationchange`);constructor(t,n){super(e.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};function k(e){return`${D?.runtime?.id}:content:${e}`}var A=typeof globalThis.navigation?.addEventListener==`function`;function j(e){let t,n=!1;return{run(){n||(n=!0,t=new URL(location.href),A?globalThis.navigation.addEventListener(`navigate`,e=>{let n=new URL(e.destination.url);n.href!==t.href&&(window.dispatchEvent(new O(n,t)),t=n)},{signal:e.signal}):e.setInterval(()=>{let e=new URL(location.href);e.href!==t.href&&(window.dispatchEvent(new O(e,t)),t=e)},1e3))}}}var M=class e{static SCRIPT_STARTED_MESSAGE_TYPE=k(`wxt:content-script-started`);id;abortController;locationWatcher=j(this);constructor(e,t){this.contentScriptName=e,this.options=t,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return D.runtime?.id??this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener(`abort`,e),()=>this.signal.removeEventListener(`abort`,e)}block(){return new Promise(()=>{})}setInterval(e,t){let n=setInterval(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearInterval(n)),n}setTimeout(e,t){let n=setTimeout(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearTimeout(n)),n}requestAnimationFrame(e){let t=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(t)),t}requestIdleCallback(e,t){let n=requestIdleCallback((...t)=>{this.signal.aborted||e(...t)},t);return this.onInvalidated(()=>cancelIdleCallback(n)),n}addEventListener(e,t,n,r){t===`wxt:locationchange`&&this.isValid&&this.locationWatcher.run(),e.addEventListener?.(t.startsWith(`wxt:`)?k(t):t,n,{...r,signal:this.signal})}notifyInvalidated(){this.abort(`Content script context invalidated`),E.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(e.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),this.options?.noScriptStartedPostMessage||window.postMessage({type:e.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},`*`)}verifyScriptStartedEvent(e){let t=e.detail?.contentScriptName===this.contentScriptName,n=e.detail?.messageId===this.id;return t&&!n}listenForNewerScripts(){let t=e=>{!(e instanceof CustomEvent)||!this.verifyScriptStartedEvent(e)||this.notifyInvalidated()};document.addEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t))}},N={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{let{main:e,...t}=T;return await e(new M(`content`,t))}catch(e){throw N.error(`The content script "content" crashed on startup!`,e),e}})()})();
content;