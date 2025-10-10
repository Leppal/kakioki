import sodium from "libsodium-wrappers-sumo";

let ready: Promise<typeof sodium> | null = null;

export async function getSodium() {
  if (!ready) {
    ready = sodium.ready.then(() => sodium);
  }
  return ready;
}
