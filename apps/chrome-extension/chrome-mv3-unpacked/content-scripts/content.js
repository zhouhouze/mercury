var content=(function(){function e(e){return e}function t(e,t){let r=new URL(t),i=Array.from(e.querySelectorAll(`h1,h2,h3`)).slice(0,80).map(e=>({level:Number(e.tagName.slice(1)),text:n(e.textContent??``)})).filter(e=>e.text.length>0),a=e.getSelection()?.toString(),o=e.body,s=n(o&&(o.innerText||o.textContent)||``);return{url:t,title:e.title||r.hostname,domain:r.hostname,captured_at:new Date().toISOString(),headings:i,selected_text:a?n(a):void 0,visible_text:s.slice(0,24e3),cleaned_text:s.slice(0,24e3)}}function n(e){return e.replace(/\s+/g,` `).trim()}var r=.8;function i(e,t){let n=t<440?Math.max(320,Math.min(t,440)):440,i=Math.max(n,Math.floor(t*r));return Math.min(Math.max(Math.round(e),n),i)}function a(e,t,n=`push`){if(t<900)return`overlay`;let r=e/t;return n===`overlay`?r<.48?`push`:`overlay`:r>.52?`overlay`:`push`}function o(e,t){let n=Math.max(48,t-72);return Math.min(Math.max(Math.round(e),48),n)}function s(e,t){return e<t/2?`left`:`right`}function c(e){let t=e.split(`

`),n=t.pop()??``,r=[];for(let e of t){let t=e.split(`
`).find(e=>e.startsWith(`data:`));if(t)try{r.push(JSON.parse(t.slice(5).trim()))}catch{}}return{events:r,remainder:n}}var l=`http://127.0.0.1:17861`,u=`navia_last_session_id`;async function ee(){return!!(await v({path:`/v1/health`})).ok}async function d(e){let t=(await v({path:`/v1/sessions`,method:`POST`,headers:{"Content-Type":`application/json`},body:{client:`chrome-extension`,metadata:{source:e}}})).data.session_id;return await chrome.storage.local.set({[u]:t}),t}async function f(){let e=(await chrome.storage.local.get(u))[u];return typeof e==`string`&&e.startsWith(`sess_`)?e:null}async function p(){await chrome.storage.local.remove(u)}async function te(e){let t=await v({path:`/v1/sessions/${e}`});return t.ok?t.data:(await p(),null)}async function m(e,t){let n=await v({path:`/v1/page/context`,method:`POST`,headers:{"Content-Type":`application/json`},body:{...e,session_id:t}});return n.ok?(await chrome.storage.local.set({[u]:t}),{ok:!0,pageId:n.data.page_id,structuredPage:n.data.structuredPage}):{ok:!1,message:n.error?.message??`PageContext submit failed.`}}async function h(e,t,n){let r={path:`/v1/chat/stream`,method:`POST`,headers:{"Content-Type":`application/json`},body:{session_id:e,message:t,source:`typed`,request_id:`req_${crypto.randomUUID().replace(/-/g,``)}`}};if(y())return b(r,n);let i=await fetch(`${l}/v1/chat/stream`,{method:r.method,headers:r.headers,body:JSON.stringify(r.body)});if(!i.body)throw Error(`SSE response body is empty.`);await _(i.body,n)}function g(e){let t=new Map((e.artifacts??[]).map(e=>[e.turnId,e]));return(e.messages??[]).filter(e=>e.role===`user`||e.role===`assistant`||e.role===`system`).map(e=>({id:e.message_id,role:e.role,text:e.content,turnId:e.turn_id,artifact:e.turn_id?t.get(e.turn_id):void 0}))}async function _(e,t){let n=e.getReader(),r=new TextDecoder,i=``;for(;;){let{value:e,done:a}=await n.read();if(a)break;i+=r.decode(e,{stream:!0});let o=c(i);i=o.remainder;for(let e of o.events)t(e)}}async function v(e){if(y()){let t=await chrome.runtime.sendMessage({type:`navia.runtimeFetch`,request:e});if(!t.ok||!t.response)throw Error(t.error??`Runtime proxy failed.`);return t.response.body}return await(await fetch(`${l}${e.path}`,{method:e.method??`GET`,headers:e.headers,body:e.body===void 0?void 0:JSON.stringify(e.body)})).json()}function y(){return typeof chrome<`u`&&!!chrome.runtime?.sendMessage&&window.location.protocol!==`chrome-extension:`}async function b(e,t){let n=chrome.runtime.connect({name:`navia.runtimeStream`}),r=``;return new Promise((i,a)=>{n.onMessage.addListener(e=>{if(e?.type===`chunk`&&typeof e.text==`string`){r+=e.text;let n=c(r);r=n.remainder;for(let e of n.events)t(e);return}if(e?.type===`done`){n.disconnect(),i();return}e?.type===`error`&&(n.disconnect(),a(Error(String(e.message??`Runtime stream proxy failed.`))))}),n.postMessage({type:`navia.runtimeStream`,request:e})})}var x=`navia-injected-host`,S=`navia_panel_position`,ne=440,C=`mermaid-renderer.html`;function re(e,t,n=`push`){return a(e,t,n)}function w(e,t){return i(e,t)}function T(){return typeof chrome<`u`&&chrome.runtime?.getURL?chrome.runtime.getURL(C):C}function E(e,t=T()){let n=document.createElement(`div`);n.className=`navia-artifact navia-artifact-viewer`,n.dataset.rendered=`pending`,n.dataset.artifactId=e.artifactId;let r=document.createElement(`iframe`);r.className=`navia-mermaid-frame`,r.title=`Mermaid mindmap`,r.src=t,r.addEventListener(`load`,()=>{r.contentWindow?.postMessage({type:`navia.renderMermaid`,artifactId:e.artifactId,source:e.content},`*`)});let i=document.createElement(`details`);i.className=`navia-mermaid-source`;let a=document.createElement(`summary`);a.textContent=`Mermaid source`;let o=document.createElement(`pre`);o.textContent=e.content,i.append(a,o),n.append(r,i);let s=t=>{if(t.source!==r.contentWindow)return;let a=t.data;a.type!==`navia.mermaidRendered`||a.artifactId!==e.artifactId||(n.dataset.rendered=a.status===`succeeded`?`true`:`false`,a.status!==`succeeded`&&(i.open=!0,n.title=a.message??`Mermaid render failed`),window.removeEventListener(`message`,s))};return window.addEventListener(`message`,s),n}function D(){if(document.getElementById(x)||!/^https?:|^file:/.test(window.location.href))return null;let e=document.createElement(`div`);e.id=x,document.documentElement.appendChild(e);let n=e.attachShadow({mode:`open`}),r=be(),i={open:!1,side:r.side,y:$(r.y),width:w(ne,window.innerWidth),activeTool:`chat`,runtimeStatus:`checking`,sessionId:null,pageContext:null,structuredPageDebug:null,pageSubmitted:!1,statusText:`正在检查 Runtime...`,streamStatus:`idle`,lastError:null},a=[{id:O(),role:`system`,text:`展开后读取当前页面，即可开始网页伴读。`}],c=`push`,l=null;n.innerHTML=`${oe()}${ae()}`;let u=n.querySelector(`[data-testid='navia-frame']`),p=n.querySelector(`[data-testid='navia-ball']`),_=n.querySelector(`[data-testid='navia-hover-strip']`);n.querySelector(`[data-testid='navia-panel']`);let v=n.querySelector(`[data-testid='navia-resize-handle']`),y=n.querySelector(`[data-testid='navia-collapse']`),b=n.querySelector(`[data-testid='navia-reconnect']`),C=n.querySelector(`[data-testid='navia-debug-reconnect']`),T=n.querySelector(`[data-testid='navia-tool-chat']`),D=n.querySelector(`[data-testid='navia-tool-debug']`),k=n.querySelector(`[data-testid='navia-read-page']`),A=n.querySelector(`[data-testid='navia-debug-read-page']`),j=n.querySelector(`[data-testid='navia-summary']`),M=n.querySelector(`[data-testid='navia-debug-summary']`),N=n.querySelector(`[data-testid='navia-mindmap']`),P=n.querySelector(`[data-testid='navia-debug-mindmap']`),F=n.querySelector(`[data-testid='navia-new-chat']`),I=n.querySelector(`[data-testid='navia-send']`),L=n.querySelector(`[data-testid='navia-input']`),R=n.querySelector(`[data-testid='navia-messages']`),se=n.querySelector(`[data-testid='navia-status']`),ce=n.querySelector(`[data-testid='navia-page']`),le=n.querySelector(`[data-testid='navia-state-banner']`),z=n.querySelector(`[data-testid='navia-chat-notice']`),B=n.querySelector(`[data-testid='navia-structured-json']`);return p.addEventListener(`click`,()=>{i.open&&H()}),_.addEventListener(`click`,()=>V()),y.addEventListener(`click`,()=>H()),b.addEventListener(`click`,()=>W()),C.addEventListener(`click`,()=>W()),T.addEventListener(`click`,()=>U(`chat`)),D.addEventListener(`click`,()=>U(`debug`)),k.addEventListener(`click`,()=>K()),A.addEventListener(`click`,()=>K()),j.addEventListener(`click`,()=>q(`总结这篇文章`)),M.addEventListener(`click`,()=>q(`总结这篇文章`)),N.addEventListener(`click`,()=>q(`生成 Mermaid 思维导图`)),P.addEventListener(`click`,()=>q(`生成 Mermaid 思维导图`)),F.addEventListener(`click`,()=>ue()),I.addEventListener(`click`,()=>q(L.value)),L.addEventListener(`keydown`,e=>{(e.metaKey||e.ctrlKey)&&e.key===`Enter`&&(e.preventDefault(),q(L.value))}),pe(),me(),window.addEventListener(`resize`,()=>{i.y=$(i.y),i.width=w(i.width,window.innerWidth),X()}),W(),X(),{open:V,close:H};function V(){if(i.open=!0,X(),i.runtimeStatus===`online`&&!i.pageSubmitted){K();return}i.runtimeStatus!==`online`&&W().then(()=>{i.runtimeStatus===`online`&&!i.pageSubmitted&&K()})}function H(){i.open=!1,Q(),X()}function U(e){i.activeTool=e,X()}async function ue(){i.sessionId=null,i.pageContext=null,i.structuredPageDebug=null,i.pageSubmitted=!1,i.streamStatus=`idle`,i.lastError=null,i.statusText=i.runtimeStatus===`online`?`已新建会话`:i.statusText,a.splice(0,a.length,{id:O(),role:`system`,text:`新会话已创建。读取当前页面后即可继续网页伴读。`}),L.value=``,i.runtimeStatus===`online`&&(i.sessionId=await d(`injected-panel`)),X()}async function W(){i.runtimeStatus=`checking`,i.statusText=`正在检查 Runtime...`,i.lastError=null,X();try{let e=await ee();i.runtimeStatus=e?`online`:`offline`,i.statusText=e?`Runtime online`:`Runtime offline`,e&&await de()}catch{i.runtimeStatus=`offline`,i.statusText=`Runtime offline，请启动本地服务`,i.lastError=`Local Runtime 未连接，启动后点击重连。`}X()}async function G(){if(i.sessionId)return i.sessionId;let e=await d(`injected-panel`);return i.sessionId=e,e}async function de(){let e=await f();if(e)try{let t=await te(e);if(!t)return;i.sessionId=t.session_id,t.activePage&&(i.pageContext={url:t.activePage.url,title:t.activePage.title,domain:t.activePage.domain,captured_at:t.activePage.captured_at??new Date().toISOString(),headings:[],visible_text:``,cleaned_text:``},i.pageSubmitted=!0,i.statusText=`已恢复：${t.activePage.title}`);let n=g(t);n.length>0&&a.splice(0,a.length,...n)}catch{i.statusText=`最近 session 恢复失败`}}async function K(){if(i.runtimeStatus!==`online`){i.statusText=`Runtime offline，无法提交页面上下文`,i.lastError=`Runtime offline，无法读取并提交当前页面。`,X();return}i.statusText=`正在读取当前页面...`,i.lastError=null,X();try{let e=t(document,window.location.href);i.pageContext=e;let n=await m(e,await G());i.pageSubmitted=n.ok,i.structuredPageDebug=n.structuredPage??null,i.statusText=n.ok?`已提交页面：${e.title}`:n.message??`页面上下文提交失败`}catch(e){i.pageSubmitted=!1,i.statusText=`读取失败：${e instanceof Error?e.message:`unknown error`}`,i.lastError=e instanceof Error?e.message:`PageContext 读取失败。`}X()}async function q(e){let t=e.trim();if(!t)return;if(i.runtimeStatus!==`online`){J(`system`,`Runtime offline，请启动 Local Runtime 后重试。`),i.lastError=`Runtime offline，无法发送消息。`,X();return}if(!i.pageSubmitted){J(`system`,`请先读取当前页面。`),i.lastError=`缺少当前页面上下文，不能生成摘要或回答。`,X();return}let n=await G(),r=O();a.push({id:O(),role:`user`,text:t}),a.push({id:r,role:`assistant`,text:``}),L.value=``,i.streamStatus=`streaming`,i.lastError=null,X();try{await h(n,t,e=>fe(e,r)),i.streamStatus=`done`}catch(e){i.runtimeStatus=`offline`,i.streamStatus=`error`,i.lastError=`连接 Runtime 失败：${e instanceof Error?e.message:`unknown error`}`,Y(r,i.lastError)}X()}function fe(e,t){switch(e.type){case`response.delta`:Y(t,String(e.data.text??``));return;case`artifact.created`:Y(t,``,e.data.artifact);return;case`tool.started`:i.streamStatus=`running ${String(e.data.tool_name??`tool`)}`,X();return;case`tool.done`:i.streamStatus=`tool done`,X();return;case`error`:i.lastError=String(e.data.message??e.data.code??`Runtime error`),Y(t,`\n${i.lastError}`),i.streamStatus=`error`,X();return;default:return}}function J(e,t){a.push({id:O(),role:e,text:t}),X()}function Y(e,t,n){let r=a.find(t=>t.id===e);r&&(t&&(r.text+=t),n&&(r.artifact=n),X())}function pe(){let e=!1,t=0,n=0;p.addEventListener(`pointerdown`,r=>{e=!0,t=r.clientY,n=i.y,p.setPointerCapture(r.pointerId)}),p.addEventListener(`pointermove`,r=>{e&&(i.y=$(n+r.clientY-t),X())}),p.addEventListener(`pointerup`,t=>{e&&(e=!1,i.side=s(t.clientX,window.innerWidth),xe({side:i.side,y:i.y}),X())})}function me(){let e=!1;v.addEventListener(`pointerdown`,t=>{e=!0,v.setPointerCapture(t.pointerId),t.preventDefault()}),v.addEventListener(`pointermove`,t=>{e&&(i.width=w(i.side===`right`?window.innerWidth-t.clientX:t.clientX,window.innerWidth),X())}),v.addEventListener(`pointerup`,()=>{e=!1})}function X(){u.dataset.open=String(i.open),u.dataset.side=i.side,u.style.setProperty(`--navia-y`,`${i.y}px`),u.style.setProperty(`--navia-width`,`${i.width}px`),c=re(i.width,window.innerWidth,c),u.dataset.mode=c,u.dataset.widthState=ie(i.width,window.innerWidth,c),u.dataset.runtime=i.runtimeStatus,u.dataset.submitted=String(i.pageSubmitted),u.dataset.pageState=i.pageSubmitted?`submitted`:`missing`,u.dataset.stream=i.streamStatus,u.dataset.error=i.lastError?`true`:`false`,u.dataset.activeTool=i.activeTool,se.textContent=`${i.statusText} · ${i.streamStatus}`,ce.textContent=i.pageContext?`${i.pageContext.title} · ${i.pageContext.domain} · headings ${i.pageContext.headings.length}`:`尚未读取页面`,B.textContent=JSON.stringify(_e(),null,2),le.textContent=he(),z.textContent=ge(),T.classList.toggle(`active`,i.activeTool===`chat`),D.classList.toggle(`active`,i.activeTool===`debug`),T.setAttribute(`aria-current`,i.activeTool===`chat`?`true`:`false`),D.setAttribute(`aria-current`,i.activeTool===`debug`?`true`:`false`),j.disabled=!Z(),M.disabled=!Z(),N.disabled=!Z(),P.disabled=!Z(),I.disabled=!Z();let e=R.scrollHeight-R.scrollTop-R.clientHeight<24;R.innerHTML=``;for(let e of a){let t=document.createElement(`article`);t.className=`navia-message ${e.role}`;let n=document.createElement(`pre`);n.textContent=e.text||(e.role===`assistant`?`...`:``),t.appendChild(n),R.appendChild(t),e.artifact?.metadata?.format===`mermaid`&&ye(e.artifact,t)}e&&(R.scrollTop=R.scrollHeight),i.open&&c===`push`&&ve(),(!i.open||c===`overlay`)&&Q()}function Z(){return i.runtimeStatus===`online`&&i.pageSubmitted&&i.streamStatus!==`streaming`}function he(){return i.lastError?i.lastError:i.runtimeStatus===`offline`?`Runtime offline，请启动本地服务后点击重连。`:i.runtimeStatus===`checking`?`正在检查 Local Runtime 状态。`:i.pageSubmitted?i.streamStatus===`streaming`?`正在生成回复，请稍候。`:i.streamStatus.startsWith(`running`)?`工具执行中：${i.streamStatus.replace(`running `,``)}`:i.statusText.startsWith(`已恢复`)?`已恢复最近会话，可继续基于当前页面提问。`:`当前页面已就绪，可进行摘要和问答。`:`尚未读取当前页面，摘要和问答会保持禁用。`}function ge(){return i.runtimeStatus===`offline`?`Runtime offline，启动本地服务后可继续聊天。`:i.runtimeStatus===`checking`?`正在检查 Local Runtime。`:i.pageSubmitted?i.streamStatus===`streaming`?`正在生成回复。`:i.streamStatus.startsWith(`running`)?`正在执行工具：${i.streamStatus.replace(`running `,``)}`:`当前页面已就绪。`:`读取当前页面后，聊天会基于网页内容回答。`}function _e(){return i.structuredPageDebug?i.structuredPageDebug:{status:`missing`,message:`读取当前页面后，这里会显示 A 模块返回的 StructuredPageContext。`,expectedSignals:[`pageId`,`contentHash`,`metadata`,`headingTree`,`paragraphs`,`chunks`,`annotations`,`summaryDraft`]}}function ve(){if(!l){let e=document.documentElement,t={marginLeft:e.style.marginLeft,marginRight:e.style.marginRight,transition:e.style.transition};l=()=>{e.style.marginLeft=t.marginLeft,e.style.marginRight=t.marginRight,e.style.transition=t.transition,l=null}}let e=document.documentElement;e.style.transition=`margin 220ms ease`,i.side===`right`?(e.style.marginRight=`${i.width}px`,e.style.marginLeft=``):(e.style.marginLeft=`${i.width}px`,e.style.marginRight=``)}function Q(){l&&l()}function ye(e,t){t.appendChild(E(e))}function be(){try{let e=localStorage.getItem(S);if(!e)return{side:`right`,y:Math.floor(window.innerHeight*.55)};let t=JSON.parse(e);return{side:t.side===`left`?`left`:`right`,y:$(Number(t.y)||320)}}catch{return{side:`right`,y:Math.floor(window.innerHeight*.55)}}}function xe(e){localStorage.setItem(S,JSON.stringify(e))}function $(e){return o(e,window.innerHeight)}}function ie(e,t,n){return t<900?`mobile`:n===`overlay`?`overlay`:e/t>=.48?`half`:`narrow`}function O(){return`ui_${crypto.randomUUID().replace(/-/g,``)}`}function ae(){return`
    <section class="navia-frame" data-testid="navia-frame" data-open="false" data-side="right" data-mode="push">
      <div class="navia-floating-entry" aria-label="Navia floating entry">
        <button class="navia-ball" data-testid="navia-ball" aria-label="Navia"></button>
        <button class="navia-hover-strip" data-testid="navia-hover-strip" aria-label="Open Navia">
          <span class="navia-shortcut">⌘</span>
          <span class="navia-ask-label">Ask AI</span>
          <span class="navia-hover-divider"></span>
          <span class="navia-hover-pill">AI</span>
        </button>
      </div>
      <aside class="navia-panel navia-panel-shell" data-testid="navia-panel" aria-label="Navia assistant">
        <div class="navia-resize" data-testid="navia-resize-handle" role="separator" aria-orientation="vertical"></div>
        <nav class="navia-rail navia-left-rail">
          <button class="navia-avatar" data-testid="navia-collapse" aria-label="Collapse Navia">N</button>
          <span class="navia-dot"></span>
        </nav>
        <main class="navia-workspace navia-chat-workspace">
          <section class="navia-pane navia-chat-pane" data-testid="navia-chat-pane" aria-label="Chat">
            <header class="navia-chat-header">
              <div>
                <strong>聊天</strong>
                <span data-testid="navia-status"></span>
              </div>
              <button data-testid="navia-reconnect">重连</button>
            </header>
            <div class="navia-chat-notice" data-testid="navia-chat-notice" role="status"></div>
            <section class="navia-messages" data-testid="navia-messages" aria-live="polite"></section>
            <footer class="navia-chat-footer">
              <div class="navia-chat-toolbar" aria-label="Chat actions">
                <button data-testid="navia-read-page">读取网页</button>
                <button data-testid="navia-summary">总结</button>
                <button data-testid="navia-mindmap">Mindmap</button>
                <button data-testid="navia-new-chat">新对话</button>
              </div>
              <div class="navia-composer">
                <textarea data-testid="navia-input" placeholder="基于当前网页提问..."></textarea>
                <button data-testid="navia-send">发送</button>
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
        <nav class="navia-tools navia-tool-dock" aria-label="Navia tools">
          <button class="navia-tool active" type="button" aria-current="true" data-testid="navia-tool-chat">聊天</button>
          <button class="navia-tool" type="button" disabled>画图</button>
          <button class="navia-tool" type="button" disabled>视频</button>
          <button class="navia-tool" type="button" disabled>音频</button>
          <button class="navia-tool" type="button" disabled>发现</button>
          <button class="navia-tool" type="button" disabled>更多</button>
          <button class="navia-tool" type="button" data-testid="navia-tool-debug">Debug</button>
        </nav>
      </aside>
    </section>
  `}function oe(){return`
    <style>
      :host { all: initial; }
      .navia-frame {
        --navia-y: 55vh;
        --navia-width: 440px;
        --navia-width-max: 80vw;
        --navia-left-rail-width: 72px;
        --navia-tool-dock-width: 80px;
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
        --navia-shell: #f8fafc;
        --navia-tool-bg: #f1f5f9;
        --navia-border: #d9e2ec;
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
        --navia-shadow-panel: 0 0 36px rgba(15, 23, 42, 0.2);
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
      .navia-ball, .navia-hover-strip, .navia-panel { pointer-events: auto; }
      .navia-floating-entry {
        position: fixed;
        top: var(--navia-y);
        width: 148px;
        height: 62px;
        pointer-events: none;
      }
      .navia-frame[data-side="right"] .navia-floating-entry { right: -28px; }
      .navia-frame[data-side="left"] .navia-floating-entry { left: -28px; }
      .navia-ball {
        position: absolute;
        top: 3px;
        width: 56px;
        height: 56px;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-pill);
        background: var(--navia-surface);
        box-shadow: var(--navia-shadow-ball);
        cursor: grab;
        overflow: hidden;
        z-index: 2;
      }
      .navia-frame[data-side="right"] .navia-ball { right: 0; }
      .navia-frame[data-side="left"] .navia-ball { left: 0; }
      .navia-ball::before {
        content: "";
        position: absolute;
        top: 7px;
        width: 42px;
        height: 42px;
        border-radius: var(--navia-radius-pill);
        background: linear-gradient(135deg, #746cff, var(--navia-brand-strong));
      }
      .navia-frame[data-side="right"] .navia-ball::before { right: -10px; }
      .navia-frame[data-side="left"] .navia-ball::before { left: -10px; }
      .navia-ball::after {
        content: "AI";
        position: absolute;
        top: 0;
        color: white;
        display: grid;
        height: 100%;
        width: 34px;
        place-items: center;
        font: 800 15px/1 var(--navia-font);
      }
      .navia-frame[data-side="right"] .navia-ball::after { right: 0; }
      .navia-frame[data-side="left"] .navia-ball::after { left: 0; }
      .navia-floating-entry:hover .navia-ball { outline: 3px solid rgba(99, 91, 255, 0.22); }
      .navia-hover-strip {
        position: absolute;
        top: 0;
        height: 62px;
        box-sizing: border-box;
        width: 238px;
        border: 2px solid var(--navia-brand);
        border-radius: 31px;
        background: var(--navia-surface);
        box-shadow: var(--navia-shadow-hover);
        color: #2f3b52;
        opacity: 0;
        transform: scaleX(0.72);
        transition: opacity var(--navia-motion-fast), transform var(--navia-motion-fast);
        cursor: pointer;
        pointer-events: none;
        display: grid;
        grid-template-columns: 26px auto 1px 52px;
        align-items: center;
        gap: 9px;
        padding: 0 10px 0 26px;
        font: 800 16px/1 var(--navia-font);
        z-index: 1;
      }
      .navia-frame[data-side="right"] .navia-hover-strip { right: 0; transform-origin: right center; }
      .navia-frame[data-side="left"] .navia-hover-strip { left: 0; transform-origin: left center; }
      .navia-floating-entry:hover .navia-hover-strip, .navia-hover-strip:hover {
        opacity: 1;
        transform: scaleX(1);
        pointer-events: auto;
      }
      .navia-shortcut {
        color: #748098;
        font-size: 20px;
        font-weight: 500;
      }
      .navia-ask-label { white-space: nowrap; }
      .navia-hover-divider {
        width: 1px;
        height: 30px;
        background: #eef2ff;
      }
      .navia-hover-pill {
        width: 52px;
        height: 44px;
        border-radius: var(--navia-radius-pill);
        display: grid;
        place-items: center;
        color: white;
        background: linear-gradient(135deg, #746cff, var(--navia-brand-strong));
      }
      .navia-frame[data-open="true"] .navia-hover-strip { display: none; }
      .navia-panel {
        position: fixed;
        top: 0;
        bottom: 0;
        box-sizing: border-box;
        width: var(--navia-width);
        max-width: var(--navia-width-max);
        min-width: 440px;
        display: grid;
        grid-template-columns: var(--navia-left-rail-width) minmax(0, 1fr) var(--navia-tool-dock-width);
        background: var(--navia-shell);
        border: 1px solid var(--navia-border);
        box-shadow: var(--navia-shadow-panel);
        transform: translateX(100%);
        transition: transform var(--navia-motion-panel);
      }
      .navia-frame[data-width-state="half"] .navia-panel {
        --navia-left-rail-width: 76px;
        --navia-tool-dock-width: 84px;
      }
      .navia-frame[data-width-state="overlay"] .navia-panel {
        border-left-color: rgba(99, 91, 255, 0.32);
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
      .navia-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--navia-gap-lg);
        padding-top: 18px;
        border-right: 1px solid var(--navia-border);
        background: var(--navia-brand-soft);
      }
      .navia-avatar {
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: var(--navia-radius-pill);
        background: var(--navia-brand);
        color: white;
        font-weight: 700;
        cursor: pointer;
      }
      .navia-dot { width: 8px; height: 8px; border-radius: var(--navia-radius-pill); background: var(--navia-success); }
      .navia-frame[data-runtime="offline"] .navia-dot { background: var(--navia-error); }
      .navia-frame[data-runtime="checking"] .navia-dot { background: #f59e0b; }
      .navia-workspace {
        min-width: 0;
        min-height: 0;
        display: block;
        padding: var(--navia-panel-padding);
      }
      .navia-pane {
        min-width: 0;
        min-height: 0;
        height: 100%;
      }
      .navia-frame[data-active-tool="chat"] .navia-debug-pane { display: none; }
      .navia-frame[data-active-tool="debug"] .navia-chat-pane { display: none; }
      .navia-frame[data-active-tool="debug"] .navia-debug-pane {
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
      }
      .navia-chat-header strong { display: block; font-size: 16px; }
      .navia-chat-header span { display: block; color: var(--navia-text-muted); font-size: 12px; margin-top: 4px; }
      .navia-chat-notice {
        min-height: 18px;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-md);
        background: var(--navia-surface);
        color: var(--navia-text-muted);
        font: 12px/1.35 var(--navia-font);
        padding: 8px 10px;
        overflow-wrap: anywhere;
      }
      .navia-frame[data-runtime="offline"] .navia-chat-notice,
      .navia-frame[data-error="true"] .navia-chat-notice {
        border-color: #fecaca;
        background: var(--navia-error-bg);
        color: #991b1b;
      }
      .navia-frame[data-page-state="missing"][data-runtime="online"] .navia-chat-notice {
        border-color: #fed7aa;
        background: var(--navia-warning-bg);
        color: #92400e;
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
        position: relative;
        z-index: 2;
        min-height: 38px;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-md);
        background: var(--navia-surface);
        color: #334e68;
        font-size: 12px;
        padding: 8px;
        overflow: hidden;
      }
      .navia-frame[data-page-state="missing"] .navia-page {
        border-style: dashed;
        background: #fbfdff;
        color: var(--navia-text-muted);
      }
      .navia-state-banner {
        position: relative;
        z-index: 2;
        min-height: 18px;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-md);
        background: var(--navia-info-bg);
        color: #334155;
        font: 12px/1.35 var(--navia-font);
        padding: 8px 10px;
        overflow-wrap: anywhere;
      }
      .navia-frame[data-runtime="offline"] .navia-state-banner,
      .navia-frame[data-error="true"] .navia-state-banner {
        border-color: #fecaca;
        background: var(--navia-error-bg);
        color: #991b1b;
      }
      .navia-frame[data-runtime="checking"] .navia-state-banner,
      .navia-frame[data-page-state="missing"][data-runtime="online"] .navia-state-banner {
        border-color: #fed7aa;
        background: var(--navia-warning-bg);
        color: #92400e;
      }
      .navia-frame[data-stream="streaming"] .navia-state-banner,
      .navia-frame[data-stream^="running"] .navia-state-banner {
        border-color: #c7d2fe;
        background: var(--navia-info-bg);
        color: #3730a3;
      }
      .navia-debug-json-card {
        position: relative;
        z-index: 2;
        display: grid;
        gap: 8px;
        min-height: 0;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-md);
        background: var(--navia-surface);
        padding: 10px;
      }
      .navia-debug-json-card header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .navia-debug-json-card strong {
        color: var(--navia-text);
        font-size: 13px;
      }
      .navia-debug-json-card span {
        color: var(--navia-text-muted);
        font-size: 11px;
      }
      .navia-debug-json-card pre {
        box-sizing: border-box;
        max-height: min(44vh, 460px);
        margin: 0;
        overflow: auto;
        border-radius: var(--navia-radius-sm);
        background: #0f172a;
        color: #dbeafe;
        padding: 10px;
        font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        white-space: pre;
        tab-size: 2;
      }
      .navia-actions {
        position: relative;
        z-index: 3;
        display: flex;
        gap: var(--navia-gap-sm);
        flex-wrap: wrap;
      }
      .navia-chat-footer {
        display: grid;
        gap: var(--navia-gap-sm);
        min-width: 0;
      }
      .navia-chat-toolbar {
        display: flex;
        gap: var(--navia-gap-sm);
        flex-wrap: wrap;
        min-width: 0;
      }
      button {
        border: 1px solid var(--navia-border-strong);
        border-radius: var(--navia-radius-sm);
        background: var(--navia-surface);
        color: var(--navia-text);
        font: 600 12px/1 var(--navia-font);
        padding: 8px 10px;
        cursor: pointer;
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
        border-radius: var(--navia-radius-md);
        padding: 10px;
        background: var(--navia-surface);
        border: 1px solid var(--navia-border);
        min-width: 0;
        max-width: 100%;
      }
      .navia-message.user { background: var(--navia-user-bg); border-color: #c7d2fe; }
      .navia-message.system { background: var(--navia-system-bg); }
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
      .navia-composer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--navia-gap-sm);
        min-width: 0;
        align-items: end;
      }
      .navia-composer textarea {
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        min-height: 52px;
        max-height: 140px;
        resize: vertical;
        border: 1px solid #bcccdc;
        border-radius: var(--navia-radius-md);
        padding: 9px;
        font: 13px/1.4 var(--navia-font);
      }
      .navia-tools {
        border-left: 1px solid var(--navia-border);
        background: var(--navia-tool-bg);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding-top: 18px;
        padding-bottom: 18px;
        color: var(--navia-text-muted);
        font-size: 12px;
      }
      .navia-tool {
        width: 52px;
        min-height: 32px;
        padding: 8px 4px;
        border-color: transparent;
        background: transparent;
      }
      .navia-tool.active {
        background: var(--navia-surface);
        border-color: var(--navia-border);
        color: var(--navia-brand-strong);
      }
      .navia-tool[data-testid="navia-tool-debug"] {
        margin-top: auto;
      }
      .navia-frame[data-mode="overlay"] .navia-panel { box-shadow: var(--navia-shadow-overlay); }
      @media (max-width: 899px) {
        .navia-frame { --navia-width: 100vw; }
        .navia-panel {
          min-width: 0;
          width: min(100vw, max(320px, var(--navia-width)));
          max-width: 100vw;
          grid-template-columns: var(--navia-mobile-rail-width) minmax(0, 1fr);
        }
        .navia-workspace { padding: 10px; }
        .navia-tools { display: none; }
        .navia-hover-strip {
          width: 206px;
          grid-template-columns: 24px auto 1px 48px;
          font-size: 15px;
        }
      }
    </style>
  `}var k=e({matches:[`<all_urls>`],main(){let e=D();chrome.runtime.onMessage.addListener((n,r,i)=>n?.type===`navia.openPanel`?(e?.open(),i({ok:!!e}),!0):n?.type===`navia.extractPageContext`?(i({ok:!0,context:t(document,window.location.href)}),!0):!1)}}),A={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)},j=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,M=class e extends Event{static EVENT_NAME=N(`wxt:locationchange`);constructor(t,n){super(e.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};function N(e){return`${j?.runtime?.id}:content:${e}`}var P=typeof globalThis.navigation?.addEventListener==`function`;function F(e){let t,n=!1;return{run(){n||(n=!0,t=new URL(location.href),P?globalThis.navigation.addEventListener(`navigate`,e=>{let n=new URL(e.destination.url);n.href!==t.href&&(window.dispatchEvent(new M(n,t)),t=n)},{signal:e.signal}):e.setInterval(()=>{let e=new URL(location.href);e.href!==t.href&&(window.dispatchEvent(new M(e,t)),t=e)},1e3))}}}var I=class e{static SCRIPT_STARTED_MESSAGE_TYPE=N(`wxt:content-script-started`);id;abortController;locationWatcher=F(this);constructor(e,t){this.contentScriptName=e,this.options=t,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return j.runtime?.id??this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener(`abort`,e),()=>this.signal.removeEventListener(`abort`,e)}block(){return new Promise(()=>{})}setInterval(e,t){let n=setInterval(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearInterval(n)),n}setTimeout(e,t){let n=setTimeout(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearTimeout(n)),n}requestAnimationFrame(e){let t=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(t)),t}requestIdleCallback(e,t){let n=requestIdleCallback((...t)=>{this.signal.aborted||e(...t)},t);return this.onInvalidated(()=>cancelIdleCallback(n)),n}addEventListener(e,t,n,r){t===`wxt:locationchange`&&this.isValid&&this.locationWatcher.run(),e.addEventListener?.(t.startsWith(`wxt:`)?N(t):t,n,{...r,signal:this.signal})}notifyInvalidated(){this.abort(`Content script context invalidated`),A.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(e.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),this.options?.noScriptStartedPostMessage||window.postMessage({type:e.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},`*`)}verifyScriptStartedEvent(e){let t=e.detail?.contentScriptName===this.contentScriptName,n=e.detail?.messageId===this.id;return t&&!n}listenForNewerScripts(){let t=e=>{!(e instanceof CustomEvent)||!this.verifyScriptStartedEvent(e)||this.notifyInvalidated()};document.addEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t))}},L={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{let{main:e,...t}=k;return await e(new I(`content`,t))}catch(e){throw L.error(`The content script "content" crashed on startup!`,e),e}})()})();
content;