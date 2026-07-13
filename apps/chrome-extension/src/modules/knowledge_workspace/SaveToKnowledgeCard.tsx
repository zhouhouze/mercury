import type { ExtractedPageContext } from "../../pageContext";
import type { KnowledgeOperation, KnowledgeServiceStatus, KnowledgeSource, RuntimeStatus } from "../../runtimeClient";
import { KnowledgeBuildStatus } from "./KnowledgeBuildStatus";
import { ServiceStatusBanner } from "./ServiceStatusBanner";

type SaveToKnowledgeCardProps = {
  runtimeStatus: RuntimeStatus;
  pageContext: ExtractedPageContext | null;
  serviceStatus: KnowledgeServiceStatus | null;
  serviceLoading?: boolean;
  serviceError?: string | null;
  source: KnowledgeSource | null;
  operation: KnowledgeOperation | null;
  saving?: boolean;
  saveError?: string | null;
  onRefreshStatus: () => void;
  onSave: () => void;
};

export function SaveToKnowledgeCard({
  runtimeStatus,
  pageContext,
  serviceStatus,
  serviceLoading = false,
  serviceError = null,
  source,
  operation,
  saving = false,
  saveError = null,
  onRefreshStatus,
  onSave
}: SaveToKnowledgeCardProps) {
  const canSave = runtimeStatus === "online" && Boolean(pageContext) && !saving;
  return (
    <section className="save-knowledge-card" data-testid="v2-save-to-knowledge-card" aria-label="Save current page to knowledge">
      <ServiceStatusBanner runtimeStatus={runtimeStatus} status={serviceStatus} loading={serviceLoading} error={serviceError} onRefresh={onRefreshStatus} />
      <div className="save-knowledge-main">
        <div>
          <p className="knowledge-eyebrow">V2 Memory</p>
          <h2>保存当前页到知识库</h2>
          <p>{pageContext ? pageContext.title : "请先读取当前页面。保存必须由用户主动触发。"}</p>
        </div>
        <button disabled={!canSave} onClick={onSave} type="button">
          {saving ? "保存中" : source ? "重新保存" : "保存"}
        </button>
      </div>
      <KnowledgeBuildStatus source={source} operation={operation} status={serviceStatus} />
      <p className="knowledge-footnote">
        V2-2 使用 MockKnowledgeServiceAdapter 验证合同和交互，不代表真实 data_service 已集成。
      </p>
      {saveError ? <p className="knowledge-error">{saveError}</p> : null}
    </section>
  );
}
