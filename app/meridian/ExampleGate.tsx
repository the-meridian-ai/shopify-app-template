// Meridian example: shows what the example feature gate answered for this
// store. Remove it with examples.server.ts (see the note there).
import type { getExampleGate } from "./examples.server";

type Props = {
  gate: Awaited<ReturnType<typeof getExampleGate>>;
};

export function ExampleGate({ gate }: Props) {
  return (
    <s-section slot="aside" heading="Meridian example">
      {!gate.configured ? (
        <s-paragraph>
          Meridian is not configured. Run the app with meridian dev, or deploy
          it on Meridian, to see the gate and the tracked event.
        </s-paragraph>
      ) : (
        <>
          <s-paragraph>
            <s-text>Plan: </s-text>
            {gate.planName ?? "none"}
          </s-paragraph>
          <s-paragraph>
            <s-text>Feature {gate.featureKey}: </s-text>
            {gate.enabled ? "enabled" : "not in this store's plan"}
          </s-paragraph>
          <s-paragraph>
            Each generated product records one {gate.eventKey} event.
          </s-paragraph>
        </>
      )}
    </s-section>
  );
}
