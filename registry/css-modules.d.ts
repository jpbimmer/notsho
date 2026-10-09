declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Bundler asset URLs (Vite). Used by map-panel and barcode-scanner.
declare module "*?url" {
  const url: string;
  export default url;
}
declare module "*?worker&url" {
  const url: string;
  export default url;
}
