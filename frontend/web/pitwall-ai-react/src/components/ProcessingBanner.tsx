export default function ProcessingBanner({ raceName }: { raceName: string }) {
  return (
    <div className="border border-amber-500/30 rounded-2xl bg-amber-500/5 mb-4 p-2">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-amber-400 font-black text-xs tracking-widest uppercase mb-1">
            Processing Race Results
          </p>
          <p className="text-white font-bold text-base mb-1">
            {raceName} results are being indexed
          </p>
          <p className="text-zinc-400 text-sm">
            Our AI is crunching the numbers. Scores and comparisons will appear
            automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
