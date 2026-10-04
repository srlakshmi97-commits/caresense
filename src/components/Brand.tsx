import Link from "next/link";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon.svg" width={size} height={size} alt="" aria-hidden />
  );
}

export function BrandBar({ href = "/", right }: { href?: string; right?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-[3.5rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={href} className="flex min-h-touch items-center gap-2 text-xl font-bold text-brand-deep">
          <Logo size={32} />
          CareSense
        </Link>
        {right}
      </div>
    </div>
  );
}
