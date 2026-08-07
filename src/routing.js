export function currentRoute() {
  const value = window.location.hash.replace(/^#/, "") || "/";
  return value.startsWith("/") ? value : `/${value}`;
}

export function navigate(path) { window.location.hash = path; }

export function slugify(value) {
  return String(value || "competition").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
