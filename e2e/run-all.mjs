// Runs every scenario against a live dev server + backend; exits 1 if anything fails.
const scenarios = ['./parcels-clients.mjs', './admin-users-cars.mjs', './trips.mjs']
let allGreen = true
for (const file of scenarios) {
  const { run } = await import(file)
  const green = await run()
  allGreen &&= green
}
console.log(allGreen ? '\nALL GREEN' : '\nSOME SCENARIOS FAILED')
process.exit(allGreen ? 0 : 1)
