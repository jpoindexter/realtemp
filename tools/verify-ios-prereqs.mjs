#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' })
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
  fail('full Xcode is not selected', selectedDeveloperDir.text)
} else {
  pass('full Xcode developer directory selected', selectedDeveloperDir.text)
}

const xcodebuild = run('xcrun', ['--find', 'xcodebuild'])
if (xcodebuild.ok) pass('xcodebuild found', xcodebuild.text)
else fail('xcodebuild unavailable', xcodebuild.text)

const devicectl = run('xcrun', ['--find', 'devicectl'])
if (devicectl.ok) pass('devicectl found', devicectl.text)
else fail('devicectl unavailable', devicectl.text)

if (devicectl.ok) {
  const devices = run('xcrun', ['devicectl', 'list', 'devices'])
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
  process.exit(1)
}

console.log('P5 prereqs ready: full Xcode tooling and a physical iPhone are visible.')
