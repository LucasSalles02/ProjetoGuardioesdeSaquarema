export default function PageShell({ title, description, children, actions }) {
  return (
    <section className="page-shell relative mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
      <header className="page-heading mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
