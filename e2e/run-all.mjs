// Runs every scenario against a live dev server + backend; exits 1 if anything fails.
const scenarios = ['./parcels-clients.mjs', './admin-users-cars.mjs', './trips.mjs', './np-shipment.mjs', './photos.mjs', './tracking.mjs', './moves-new.mjs']
  // Photos need the storage bucket; a local backend without it can only skip them.
  .filter((f) => !(process.env.E2E_NO_PHOTO_STORAGE && f === './photos.mjs'))
let allGreen = true
for (const file of scenarios) {
  const { run } = await import(file)
  const green = await run()
  allGreen &&= green
}
console.log(allGreen ? '\nALL GREEN' : '\nSOME SCENARIOS FAILED')
process.exit(allGreen ? 0 : 1)
