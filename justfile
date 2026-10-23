default:
    @just --list

install:
    vp install

dev:
    vp run dev

check:
    vp check
    vp run typecheck

test:
    vp test run

build:
    vp run build
    vp run prepare:web

android:
    vp run android

e2e:
    EXPO_PUBLIC_API_URL=http://localhost:3400 just build
    vp run test:e2e

native-check:
    cd apps/client && bunx expo prebuild --platform android --no-install
    cd apps/client/android && ./gradlew :app:assembleDebug :polydays-storage:connectedDebugAndroidTest -PreactNativeArchitectures=arm64-v8a
