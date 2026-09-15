export function RefreshLink({ href }: { href: string }) {
  // Full navigation deliberately fetches fresh server state after an uncertain response.
  return (
    <a href={href} className="button secondary">
      <span aria-hidden="true">↻</span>Actualizar
    </a>
  );
}
