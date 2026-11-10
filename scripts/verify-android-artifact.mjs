import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Local files / Android Build Tools only. Never invokes adb or accesses a device.
const root = fileURLToPath(new URL('../',import.meta.url))
const gradle = readFileSync(path.join(root,'android/app/build.gradle'),'utf8')
const version = /versionName "([^"]+)"/.exec(gradle)[1], code = /versionCode (\d+)/.exec(gradle)[1]
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.HOME,'Library/Android/sdk')
const tools = path.join(sdk,'build-tools',readdirSync(path.join(sdk,'build-tools')).filter(name=>existsSync(path.join(sdk,'build-tools',name,'apksigner'))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).at(-1))
const apk = path.join(root,'android/app/build/outputs/apk/debug/app-debug.apk')
const badging = execFileSync(path.join(tools,'aapt'),['dump','badging',apk],{encoding:'utf8'})
assert.match(badging,/package: name='com\.sprout\.timepractice'/)
assert.ok(badging.includes(`versionCode='${code}'`) && badging.includes(`versionName='${version}'`))
assert.match(badging,/sdkVersion:'26'/);assert.match(badging,/targetSdkVersion:'36'/)
const certificate = file => {
  const result = execFileSync(path.join(tools,'apksigner'),['verify','--verbose','--print-certs',file],{encoding:'utf8'})
  assert.match(result,/Verified using v2 scheme.*true/)
  const digest = /Signer #1 certificate SHA-256 digest: (\w+)/.exec(result)?.[1];assert.ok(digest);return digest
}
const signature = certificate(apk), previous=path.join(root,'artifacts/android/sprout-android-1.7-debug.apk')
assert.ok(existsSync(previous),'Keep the previous same-signed package for comparison.')
assert.equal(signature,certificate(previous),'Do not silently replace the signing identity.')
const dist = path.join(root,'dist'), files = readdirSync(dist,{recursive:true}).filter(name=>statSync(path.join(dist,name)).isFile())
const zipFiles = execFileSync('unzip',['-Z1',apk],{encoding:'utf8'}).trim().split('\n')
for(const entry of zipFiles.filter(name=>name.startsWith('assets/public/assets/')&&!name.endsWith('/'))) assert.ok(files.includes(entry.slice('assets/public/'.length)),`Stale bundled asset: ${entry}`)
for(const name of files) {
  const entry=`assets/public/${name}`;assert.ok(zipFiles.includes(entry),`Missing APK resource: ${name}`)
  assert.ok(execFileSync('unzip',['-p',apk,entry],{maxBuffer:20*1024*1024}).equals(readFileSync(path.join(dist,name))),`Stale APK resource: ${name}`)
}
const hash = file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const output=path.join(root,'artifacts/android');mkdirSync(output,{recursive:true})
const versioned=path.join(output,`sprout-android-${version}-debug.apk`), alias=path.join(output,'sprout-android-debug.apk')
for(const file of [versioned,alias]) {copyFileSync(apk,file);assert.equal(hash(file),hash(apk))}
console.log(`APK ${version} / code ${code}, com.sprout.timepractice, min26 / target36, v2 verified, same signer as 1.7.`)
console.log(`Verified ${files.length} APK web resources byte-for-byte against dist; original/versioned/alias hashes match.`)
console.log(`SHA-256 ${hash(apk)}\nArtifact: ${path.relative(root,versioned)}`)