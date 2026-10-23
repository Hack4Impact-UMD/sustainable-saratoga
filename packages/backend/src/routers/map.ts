import { mapMarkersInput } from "@repo/common";
import { listMapMarkers } from "@backend/services/map.ts";
import { publicProcedure, router } from "@backend/trpc/init.ts";

/** Procedures under `map.*`. */
export const mapRouter = router({
  /** Public markers for the landing page. No homeowner info. */
  markers: publicProcedure
    .input(mapMarkersInput)
    .query(({ ctx, input }) => listMapMarkers(ctx.db, input)),
});
