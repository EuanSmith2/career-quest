import { Link } from "react-router-dom";
import { Byte } from "@/components/Byte";
import { ChunkyButton } from "@/components/ChunkyButton";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Byte mood="shocked" size={160} />
      <h1 className="text-title-sm sm:text-title">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">Byte looked everywhere. This page doesn't exist, or it moved.</p>
      <ChunkyButton asChild>
        <Link to="/">Back home</Link>
      </ChunkyButton>
    </div>
  );
}
