export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-4xl rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Asset Hub 资产管理插件
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          这是 Asset Hub 的首页骨架。后续将根据功能规划逐步补充仪表盘、资产概览和审批入口等内容。
        </p>
      </section>
    </main>
  );
}
