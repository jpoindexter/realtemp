#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options })
  return {
    ok: result.status === 0,
    text: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  }
}

function pass(label, detail) {
  console.log(`ok: ${label}${detail ? ` - ${detail}` : ''}`)
}

function fail(label, detail) {
  failures += 1
  console.error(`not ready: ${label}${detail ? ` - ${detail}` : ''}`)
}

function note(label, detail) {
  console.log(`note: ${label}${detail ? ` - ${detail}` : ''}`)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function developerDirFromApp(appPath) {
  return `${appPath.replace(/\/$/, '')}/Contents/Developer`
}

function findDeveloperDirs(selectedDeveloperDir) {
  const commonApps = [
    '/Applications/Xcode.app',
    '/Applications/Xcode-beta.app',
    '/System/Volumes/Data/Applications/Xcode.app',
    '/System/Volumes/Data/Applications/Xcode-beta.app',
  ]
  const spotlight = run('mdfind', ['kMDItemCFBundleIdentifier == "com.apple.dt.Xcode"'])
  const spotlightApps = spotlight.ok ? spotlight.text.split('\n').filter(Boolean) : []
  const candidates = [
    process.env.DEVELOPER_DIR,
    selectedDeveloperDir.includes('CommandLineTools') ? null : selectedDeveloperDir,
    ...commonApps.map(developerDirFromApp),
    ...spotlightApps.map(developerDirFromApp),
  ]
  return unique(candidates).filter((dir) => existsSync(`${dir}/usr/bin/xcodebuild`))
}

let failures = 0

console.log('P5 native iPhone prereq check')

if (existsSync('ios/App/App.xcodeproj')) {
  pass('Capacitor Xcode project exists', 'ios/App/App.xcodeproj')
} else {
  fail('Capacitor Xcode project missing', 'run npm run build && npx cap sync ios')
}

const selectedDeveloperDir = run('xcode-select', ['-p'])
if (!selectedDeveloperDir.ok) {
  fail('xcode-select failed', selectedDeveloperDir.text)
} else if (selectedDeveloperDir.text.includes('CommandLineTools')) {
  note('global developer directory is Command Line Tools', selectedDeveloperDir.text)
} else {
  pass('full Xcode developer directory selected', selectedDeveloperDir.text)
}

const developerDirs = findDeveloperDirs(selectedDeveloperDir.ok ? selectedDeveloperDir.text : '')
const developerDir = developerDirs[0]
if (developerDir) {
  pass('full Xcode developer directory usable', developerDir)
  if (selectedDeveloperDir.text !== developerDir) {
    note('use this shell override', `export DEVELOPER_DIR="${developerDir}"`)
  }
} else {
  fail(
    'full Xcode app not found',
    'install Xcode from the App Store, then open it once to finish components; checked DEVELOPER_DIR, xcode-select, /Applications, and Spotlight',
  )
}

const xcrunEnv = developerDir ? { env: { ...process.env, DEVELOPER_DIR: developerDir } } : {}

const xcodebuild = run('xcrun', ['--find', 'xcodebuild'], xcrunEnv)
if (xcodebuild.ok) pass('xcodebuild found', xcodebuild.text)
else fail('xcodebuild unavailable', xcodebuild.text)

const simctl = run('xcrun', ['--find', 'simctl'], xcrunEnv)
if (simctl.ok) pass('simctl found', simctl.text)
else fail('simctl unavailable', simctl.text)

const devicectl = run('xcrun', ['--find', 'devicectl'], xcrunEnv)
if (devicectl.ok) pass('devicectl found', devicectl.text)
else fail('devicectl unavailable', devicectl.text)

if (devicectl.ok) {
  const devices = run('xcrun', ['devicectl', 'list', 'devices'], xcrunEnv)
  if (!devices.ok) {
    fail('devicectl cannot list devices', devices.text)
  } else if (/iPhone/i.test(devices.text) && !/no devices/i.test(devices.text)) {
    pass('iPhone visible to devicectl')
  } else {
    fail('no physical iPhone visible to devicectl', "connect and trust Jason's iPhone, then rerun")
  }
}

if (failures) {
  console.error(`P5 not ready: ${failures} prerequisite check${failures === 1 ? '' : 's'} failed.`)
  console.error('After these pass: npm run build && npx cap sync ios, then build/run App in Xcode on the physical iPhone.')
  if (developerDir) {
    console.error(`If xcode-select stays on Command Line Tools, prefix commands with: DEVELOPER_DIR="${developerDir}"`)
  }
  process.exit(1)
}

console.log('P5 prereqs ready: full Xcode tooling and a physical iPhone are visible.')
