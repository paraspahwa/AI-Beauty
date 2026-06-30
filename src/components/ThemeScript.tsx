/** Runs before paint to avoid light flash when dark mode is saved. */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("renovaara_theme");if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
