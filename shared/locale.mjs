import nepali from "./ne.json" with { type: "json" };
export function normalizeDigits(value) {
  return typeof value === "string"
    ? value.replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    : value;
}
export function translate(key, language = "en", values = {}) {
  if (key == null) return "";
  const trimmed = key.trim();
  let result =
    language === "ne" && nepali[trimmed]
      ? key.replace(trimmed, nepali[trimmed])
      : key;
  if (language === "ne" && !nepali[trimmed]) {
    for (const [pattern, translated] of Object.entries(nepali)) {
      if (!pattern.includes("{{")) continue;
      const names = [];
      const escaped = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\{\\\{(\w+)\\\}\\\}/g, (_, name) => {
          names.push(name);
          return "(.+?)";
        });
      const match = trimmed.match(new RegExp(`^${escaped}$`));
      if (match) {
        result = key.replace(
          trimmed,
          translated.replace(/\{\{(\w+)\}\}/g, (_, name) => {
            const value = match[names.indexOf(name) + 1];
            return name === "label" ? nepali[value] || value : value;
          }),
        );
        break;
      }
    }
  }
  return result.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    String(values[name] ?? ""),
  );
}
