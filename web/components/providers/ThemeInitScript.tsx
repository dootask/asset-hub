export function ThemeInitScript({
  storageKey
}: {
  storageKey?: string;
}
) {
  if (!storageKey) {
    return null;
  }

  const script = `(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var theme = params.get("theme");
    if (!theme) return;
    var next = String(theme).toLowerCase().indexOf("dark") !== -1 ? "dark" : "light";
    localStorage.setItem(${JSON.stringify(storageKey)}, next);
  } catch (e) {}
})();`;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}

