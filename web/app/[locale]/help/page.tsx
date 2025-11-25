import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";

type PageParams = { locale: string };

export const metadata: Metadata = {
  title: "Help Center - Asset Hub",
};

type SectionConfig = {
  key: string;
  zh: {
    title: string;
    description: string;
    items: { title: string; points: string[] }[];
  };
  en: {
    title: string;
    description: string;
    items: { title: string; points: string[] }[];
  };
};

const HELP_SECTIONS: SectionConfig[] = [
  {
    key: "assets",
    zh: {
      title: "资产管理功能",
      description: "覆盖资产的入库、维护、查询与盘点流程，确保数据口径一致。",
      items: [
        {
          title: "资产列表",
          points: [
            "按状态、类别、所属公司或关键字筛选，并支持排序与分页。",
            "列表项可跳转到资产详情，便于继续操作或查看审批记录。",
            "导出按钮会根据当前筛选条件生成 CSV，方便做外部分析。",
          ],
        },
        {
          title: "资产详情",
          points: [
            "基础信息卡片支持快速编辑核心字段（位置、负责人、备注等）。",
            "操作时间线记录所有操作、审批与系统自动动作，方便追溯。",
            "右侧工具区可直接发起操作、审批或导出该资产的操作记录。",
          ],
        },
        {
          title: "导入、导出与盘点",
          points: [
            "下载模板批量导入资产，支持字段校验与错误提示。",
            "可以按筛选条件导出资产数据，用于财务或审计复核。",
            "盘点任务会在任务详情中记录实盘数量和差异说明，可生成报告。",
          ],
        },
      ],
    },
    en: {
      title: "Asset Management",
      description: "Everything you need to onboard, maintain, search, and audit assets.",
      items: [
        {
          title: "Asset List",
          points: [
            "Filter by status, category, company, or keyword with sortable, paginated results.",
            "Each row links to the asset detail page for follow-up actions or approvals.",
            "Exports respect current filters so you can build CSV snapshots for finance or audits.",
          ],
        },
        {
          title: "Asset Detail",
          points: [
            "Edit core fields inline (location, owner, notes, etc.) inside the info card.",
            "The timeline surfaces every operation, approval, or automated update.",
            "Quick actions let you start new operations, approvals, or export the activity log.",
          ],
        },
        {
          title: "Imports, Exports & Inventory",
          points: [
            "Download templates to import assets in bulk with validation feedback.",
            "Export the current filtered dataset to CSV for downstream analytics.",
            "Inventory tasks capture physical counts, differences, and downloadable results.",
          ],
        },
      ],
    },
  },
  {
    key: "asset-operations",
    zh: {
      title: "资产操作与审批",
      description: "让采购、入库、领用、借用等操作与审批流打通，避免线下沟通。",
      items: [
        {
          title: "常见操作类型",
          points: [
            "支持采购、入库、领用、借用/归还、派发、报废等动作。",
            "操作模板可配置字段、提示与附件要求，例如入库需上传多张照片。",
            "提交时会记录发起人、说明和附件，并同步到操作时间线。",
          ],
        },
        {
          title: "发起审批",
          points: [
            "可在资产详情或操作表单里直接发起审批，请求会引用审批配置。",
            "系统根据操作类型自动选择默认审批人，也支持按角色或手动指定。",
            "审批申请支持填写事由、上传附件，并关联操作模板字段。",
          ],
        },
        {
          title: "审批结果联动",
          points: [
            "审批通过后自动更新资产状态、负责人或生成后续操作（如待入库）。",
            "驳回或撤销会同步把相关操作标记为取消，保持数据一致。",
            "审批历史会写入资产时间线，方便在详情页直接查看结论。",
          ],
        },
      ],
    },
    en: {
      title: "Asset Operations & Approvals",
      description: "Connect every business action with a traceable approval trail.",
      items: [
        {
          title: "Supported Actions",
          points: [
            "Covers purchase, inbound, receive, borrow/return, distribute, and disposal flows.",
            "Operation templates control required fields, helper texts, and attachment rules (e.g. inbound photos).",
            "Each submission logs the actor, message, and attachments into the timeline.",
          ],
        },
        {
          title: "Submitting Approvals",
          points: [
            "Launch approval forms from asset detail or directly inside relevant operation forms.",
            "Default approvers are derived from action configs, with optional role-based suggestions.",
            "Requests capture titles, reasons, attachments, and template field values for auditing.",
          ],
        },
        {
          title: "Approval Outcomes",
          points: [
            "Approved requests update asset status/owner and can auto-create follow-up operations.",
            "Rejecting or cancelling resets linked operations to “cancelled” to prevent drifting data.",
            "Every decision is synchronized back to the asset timeline for quick reference.",
          ],
        },
      ],
    },
  },
  {
    key: "consumables",
    zh: {
      title: "耗材管理",
      description: "管理耗材库存、出入库记录、盘点任务与低库存告警。",
      items: [
        {
          title: "耗材列表与详情",
          points: [
            "支持按类别、状态、关键字筛选，并查看实时库存与预留量。",
            "详情页展示操作时间线，可追踪每一次采购、入库或领用。",
            "可在详情中直接触发新的耗材操作或导出单个耗材的操作记录。",
          ],
        },
        {
          title: "库存操作",
          points: [
            "提供采购、入库、出库/领用、预留/释放、调整、处理等动作。",
            "每次操作会自动结转库存和预留数量，避免负库存。",
            "可根据额度或类型配置是否需要审批，操作通过后再变更库存。",
          ],
        },
        {
          title: "盘点与告警",
          points: [
            "盘点任务支持选择范围、负责人，并记录系统量与实盘量。",
            "当库存低于安全库存时自动创建告警，并在恢复正常后自动关闭。",
            "告警列表可快速查看待处理项目，也能联动 DooTask 待办提醒负责人。",
          ],
        },
      ],
    },
    en: {
      title: "Consumables",
      description: "Control consumable stock, operations, inventory runs, and low-stock alerts.",
      items: [
        {
          title: "List & Detail",
          points: [
            "Filter by category, status, or keyword while monitoring on-hand vs reserved quantities.",
            "The detail timeline shows every purchase, inbound, outbound, or adjustment.",
            "Start new consumable operations or export the item history directly in the detail view.",
          ],
        },
        {
          title: "Stock Operations",
          points: [
            "Support purchase, inbound, outbound/issue, reserve/release, adjustment, and processing flows.",
            "Each action updates stock and reservation numbers atomically to prevent negative balances.",
            "Approval requirements can be toggled per action, ensuring large or sensitive moves stay gated.",
          ],
        },
        {
          title: "Inventory & Alerts",
          points: [
            "Inventory tasks capture scope, owner, and the delta between system count and physical count.",
            "Low-stock alerts fire automatically and close once stock recovers above the threshold.",
            "Alerts can push to DooTask todos so stakeholders get timely reminders.",
          ],
        },
      ],
    },
  },
  {
    key: "approvals",
    zh: {
      title: "审批中心",
      description: "集中查看待办、我发起的申请以及历史审批记录。",
      items: [
        {
          title: "列表视图",
          points: [
            "内置“待我审批 / 我发起的 / 全部”三个视角。",
            "支持按审批类型、状态、时间范围、资产或耗材筛选。",
            "分页列表可直接跳转至审批详情或关联资产。",
          ],
        },
        {
          title: "审批详情",
          points: [
            "展示申请基础信息、事由、附件及关联的资产/耗材操作。",
            "历史记录区会列出每一步的处理人、时间与意见。",
            "支持在详情中快速切换到资产/耗材详情页继续处理。",
          ],
        },
        {
          title: "操作与权限",
          points: [
            "只有审批人或具备审批权限的用户才能看到同意/驳回按钮。",
            "申请人随时可以撤销待审批的请求，系统管理员拥有兜底权限。",
            "审批动作会调用 DooTask 待办接口，保持宿主状态同步。",
          ],
        },
      ],
    },
    en: {
      title: "Approval Center",
      description: "Track every approval you submitted, need to process, or have archived.",
      items: [
        {
          title: "List Views",
          points: [
            "Tabs include “My Tasks”, “My Requests”, and “All”.",
            "Filter by type, status, timeframe, asset, consumable, or operation ID.",
            "Each row links to the approval detail and its associated record.",
          ],
        },
        {
          title: "Approval Detail",
          points: [
            "Shows metadata, reasons, attachments, and linked asset/consumable operations.",
            "History captures every decision with actor, timestamp, and comments.",
            "Quick links jump back to the related asset or consumable detail page.",
          ],
        },
        {
          title: "Actions & Permissions",
          points: [
            "Only approvers or admins see approve/reject buttons.",
            "Applicants can cancel pending requests; admins can intervene when needed.",
            "Each action syncs with DooTask todos to keep the host state aligned.",
          ],
        },
      ],
    },
  },
  {
    key: "system",
    zh: {
      title: "系统管理",
      description: "面向管理员的配置入口，控制数据结构、审批策略与安全阈值。",
      items: [
        {
          title: "公司管理",
          points: [
            "维护集团/子公司信息，资产与耗材会引用公司编码。",
            "仅系统管理员可新增、编辑、删除公司。",
            "删除前需要确认该公司未被资产或耗材引用。",
          ],
        },
        {
          title: "角色与审批配置",
          points: [
            "角色记录业务身份，可配置成员并在审批策略中引用。",
            "审批配置可定义某个操作是否需要审批、默认审批人类型以及是否允许覆盖。",
            "调整配置后，新发起的审批会实时采用最新策略。",
          ],
        },
        {
          title: "操作模板与告警",
          points: [
            "操作管理支持为不同操作设置字段、提示与附件要求。",
            "告警设置可定义耗材安全库存或其它阈值，影响告警触发条件。",
            "升级管理页面展示版本号、授权信息与官方升级渠道。",
          ],
        },
      ],
    },
    en: {
      title: "System Administration",
      description: "Admin-only controls for companies, roles, approval policies, and alerts.",
      items: [
        {
          title: "Company Directory",
          points: [
            "Maintain legal entities and store unique company codes for assets/consumables.",
            "Only admins can create, edit, or delete companies.",
            "Records that are already referenced must be migrated before deletion.",
          ],
        },
        {
          title: "Roles & Approval Configs",
          points: [
            "Roles capture business responsibilities; members can be picked via DooTask selectors.",
            "Action configs define whether an operation needs approval, default approver type, and overrides.",
            "Any updates take effect immediately for newly created approval requests.",
          ],
        },
        {
          title: "Operation Templates & Alerts",
          points: [
            "Operation settings control required fields, helper texts, and attachment policies.",
            "Alert settings define thresholds such as consumable safety stock.",
            "The upgrade page shows version, license, and official contact channels.",
          ],
        },
      ],
    },
  },
  {
    key: "reports",
    zh: {
      title: "报表与分析",
      description: "帮助管理员快速评估资产与审批的运行状态。",
      items: [
        {
          title: "首页仪表盘",
          points: [
            "统计卡片覆盖资产总数、使用中资产、待审批与低库存耗材等指标。",
            "分布图表展示状态、类别占比以及操作/审批趋势。",
            "快捷入口引导管理员直达资产列表、审批中心、帮助中心等页面。",
          ],
        },
        {
          title: "系统报表",
          points: [
            "系统管理下的“报表统计”展示操作明细与汇总指标。",
            "可按时间区间、操作类型、操作者等维度筛选。",
            "支持导出为 CSV，用于二次加工或外部审计。",
          ],
        },
        {
          title: "自定义报表规划",
          points: [
            "为后续扩展预留“自定义报表”入口，可按需增加字段组合。",
            "当前版本可通过导出 + BI 工具实现更细致的分析。",
          ],
        },
      ],
    },
    en: {
      title: "Reports & Insights",
      description: "Stay on top of asset KPIs, approval throughput, and operational trends.",
      items: [
        {
          title: "Dashboard",
          points: [
            "Highlight cards cover total assets, in-use devices, pending approvals, and low-stock consumables.",
            "Distribution widgets reveal status/category breakdowns plus operation & approval trends.",
            "Shortcuts link directly to asset list, approvals, inventory, and this help center.",
          ],
        },
        {
          title: "System Reports",
          points: [
            "The System › Reports page lists operational logs with aggregate stats.",
            "Filter by timeframe, action type, or operator to slice the data.",
            "Export CSVs for finance reviews or compliance evidence.",
          ],
        },
        {
          title: "Custom Reports (Roadmap)",
          points: [
            "A reserved entry exists for future customizable reports.",
            "Until then, combine exports with your BI stack for tailored charts.",
          ],
        },
      ],
    },
  },
  {
    key: "permissions",
    zh: {
      title: "权限与限制",
      description: "结合环境变量与审批角色，保障不同身份的操作边界。",
      items: [
        {
          title: "身份划分",
          points: [
            "系统/资产管理员：可访问系统管理与全部业务页面。",
            "审批人：可以在审批中心处理待办，但无权修改系统配置。",
            "普通用户：可发起与自己相关的资产/耗材操作与审批。",
          ],
        },
        {
          title: "审批权限",
          points: [
            "只有配置在 `ASSET_HUB_APPROVER_USER_IDS` 或管理员列表中的用户才能审批。",
            "审批权限会通过接口强校验，即使前端按钮被隐藏也无法绕过。",
            "审批操作需要 DooTask 注入的用户上下文，确保责任可追踪。",
          ],
        },
        {
          title: "高危操作限制",
          points: [
            "系统管理、公司/角色配置、审批策略等仅向管理员开放。",
            "导入、删除、批量导出等操作需要管理员或显式授权。",
            "操作日志与审批历史可用于审计，建议定期导出备份。",
          ],
        },
      ],
    },
    en: {
      title: "Permissions & Safeguards",
      description: "Environment variables and approval roles define who can do what.",
      items: [
        {
          title: "Personas",
          points: [
            "Admins: full access to system settings and all business modules.",
            "Approvers: process approvals but cannot change admin settings.",
            "Users: initiate operations or approvals that relate to their assets/consumables.",
          ],
        },
        {
          title: "Approval Rights",
          points: [
            "Only IDs listed in `ASSET_HUB_APPROVER_USER_IDS` (or admins) may approve requests.",
            "APIs enforce this regardless of what the UI shows.",
            "Approval actions rely on the DooTask user context for accountability.",
          ],
        },
        {
          title: "High-Risk Actions",
          points: [
            "System configuration, company/role management, and approval policies are admin-only.",
            "Imports, deletions, and bulk exports require admin or explicit authorization.",
            "Operation logs plus approval history can be exported for audits—do so regularly.",
          ],
        },
      ],
    },
  },
  {
    key: "faq",
    zh: {
      title: "常见问题",
      description: "整理了一些使用过程中经常遇到的问题和处理方式。",
      items: [
        {
          title: "为什么我看不到“系统管理”菜单？",
          points: [
            "系统管理入口只对管理员开放，管理员 ID 由运维在环境变量 `ASSET_HUB_ADMIN_USER_IDS` 中配置。",
            "如果你确认自己应具备管理员权限，请联系系统管理员或运维人员检查环境变量配置。",
          ],
        },
        {
          title: "发起审批时提示“未配置审批人 / 该类型无需审批”？",
          points: [
            "审批是否必需、默认审批人是谁，取决于系统管理中的“审批配置”和“操作模板”设置。",
            "如果业务需要审批但当前被标记为“无需审批”，请让管理员在系统管理 › 审批配置中开启相应操作的审批并设置默认审批人。",
          ],
        },
        {
          title: "为什么某些操作提交后一直在“待审批”，没有自动更新资产状态？",
          points: [
            "资产状态只会在审批通过后由系统自动更新，单纯提交操作或草稿不会改变资产状态。",
            "如果审批已通过但状态未更新，请先在审批详情确认结果，再检查对应资产操作时间线中是否有失败记录。",
          ],
        },
        {
          title: "导入资产 / 耗材时提示字段错误怎么办？",
          points: [
            "请优先使用系统提供的导入模板，确保字段名和数据格式与模板保持一致。",
            "如果提示某个编码不存在（如公司编码、类别编码），需要先在系统管理中创建对应公司或类别，再重新导入。",
          ],
        },
        {
          title: "为什么在浏览器直接打开地址会提示“请在 DooTask 插件环境中打开”？",
          points: [
            "Asset Hub 设计为 DooTask 插件，只支持在 DooTask 宿主环境中运行。",
            "请从 DooTask 应用中心或项目侧边栏中打开 Asset Hub，而不是手动输入 URL。",
          ],
        },
      ],
    },
    en: {
      title: "FAQ",
      description: "A few frequently asked questions and how to resolve them.",
      items: [
        {
          title: "Why can't I see the “System” menu?",
          points: [
            "System management is admin-only and driven by the `ASSET_HUB_ADMIN_USER_IDS` environment variable.",
            "If you believe you should be an admin, ask your system administrator or ops team to verify the env configuration.",
          ],
        },
        {
          title: "Why do I see “no approver configured / approval disabled” when submitting?",
          points: [
            "Whether an action requires approval and who the default approver is are defined in System › Approval Configs and operation templates.",
            "If your business flow requires approval but the system says it is disabled, have an admin enable approval and set default approvers for that action.",
          ],
        },
        {
          title: "Why does an operation stay “pending approval” without updating asset status?",
          points: [
            "Asset status changes only after the related approval is approved; drafts or raw operations do not change status.",
            "If the approval is already approved but nothing moved, check the approval detail and the asset timeline for any failed or cancelled operations.",
          ],
        },
        {
          title: "How should I handle validation errors when importing assets/consumables?",
          points: [
            "Always start from the official import template so field names and formats match exactly.",
            "If the error mentions missing codes (e.g. company or category), create those records first in System Management, then re-import.",
          ],
        },
        {
          title: "Why do I see “Open inside DooTask plugin” when typing the URL directly?",
          points: [
            "Asset Hub is designed to run strictly as a DooTask plugin and expects the host environment.",
            "Launch Asset Hub from the DooTask app center or project sidebar instead of entering the URL manually.",
          ],
        },
      ],
    },
  },
];

export default async function HelpCenterPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const sections = HELP_SECTIONS.map((section) => ({
    key: section.key,
    ...(isChinese ? section.zh : section.en),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          { href: `/${locale}`, labelZh: "首页", labelEn: "Home" },
          { labelZh: "帮助中心", labelEn: "Help Center" },
        ]}
        title={isChinese ? "帮助中心" : "Help Center"}
        description={
          isChinese
            ? "按模块梳理常见任务、审批路径与权限边界，便于快速上手。"
            : "Module-by-module usage notes, approval flows, and permission boundaries."
        }
      />

      <div className="space-y-5">
        {sections.map((section) => (
          <section
            key={section.key}
            className="rounded-3xl border bg-card p-5 shadow-sm"
          >
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {section.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-muted/40 p-4"
                >
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {item.points.map((point) => (
                      <li key={point} className="leading-relaxed">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

