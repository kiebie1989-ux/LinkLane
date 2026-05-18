#!/usr/bin/env node
// LinkLane Unit Tests
// Run with: node tests/test.js

'use strict';

const assert = require('assert');

// ---- Pure functions replicated from addon/background.js ----

function matchesPattern(url, pattern) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(escaped, 'i').test(url);
}

function findMatchingRule(url, rules, enabled) {
    if (!enabled) return null;
    return rules.find(rule => rule.enabled && matchesPattern(url, rule.pattern)) || null;
}

// ---- Minimal test runner ----

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}: ${e.message}`);
        failed++;
    }
}

// ---- matchesPattern ----

console.log('\nmatchesPattern()');

test('exact domain match', () => {
    assert.strictEqual(matchesPattern('https://meet.google.com/abc-defg-hij', 'meet.google.com'), true);
});

test('no match for unrelated domain', () => {
    assert.strictEqual(matchesPattern('https://google.com/about', 'meet.google.com'), false);
});

test('wildcard subdomain match', () => {
    assert.strictEqual(matchesPattern('https://company.zoom.us/j/12345', '*.zoom.us/j/'), true);
});

test('wildcard does not match wrong domain', () => {
    assert.strictEqual(matchesPattern('https://notzoom.us/j/123', '*.zoom.us/j/'), false);
});

test('path segment match', () => {
    assert.strictEqual(
        matchesPattern('https://teams.microsoft.com/l/meetup-join/xyz', 'teams.microsoft.com/l/meetup-join'),
        true
    );
});

test('path segment no match on wrong path', () => {
    assert.strictEqual(matchesPattern('https://zoom.us/other/123', 'zoom.us/j/'), false);
});

test('case insensitive match', () => {
    assert.strictEqual(matchesPattern('https://MEET.GOOGLE.COM/room', 'meet.google.com'), true);
});

test('double wildcard match', () => {
    assert.strictEqual(matchesPattern('https://sub.domain.com/path/to/page', '*.domain.com/path/*'), true);
});

test('jitsi plain domain match', () => {
    assert.strictEqual(matchesPattern('https://meet.jit.si/MyRoom', 'meet.jit.si'), true);
});

test('8x8.vc match', () => {
    assert.strictEqual(matchesPattern('https://8x8.vc/myroom', '8x8.vc'), true);
});

// ---- findMatchingRule ----

console.log('\nfindMatchingRule()');

const sampleRules = [
    { id: 'r1', pattern: 'meet.google.com', browserId: 'b1', enabled: true },
    { id: 'r2', pattern: 'zoom.us/j/', browserId: 'b2', enabled: true },
    { id: 'r3', pattern: '*.jit.si', browserId: 'b1', enabled: false },
];

test('returns matching rule', () => {
    const rule = findMatchingRule('https://meet.google.com/abc', sampleRules, true);
    assert.strictEqual(rule.id, 'r1');
});

test('returns null when globally disabled', () => {
    const rule = findMatchingRule('https://meet.google.com/abc', sampleRules, false);
    assert.strictEqual(rule, null);
});

test('skips individually disabled rules', () => {
    const rule = findMatchingRule('https://sub.jit.si/room', sampleRules, true);
    assert.strictEqual(rule, null);
});

test('returns null when no rule matches', () => {
    const rule = findMatchingRule('https://example.com', sampleRules, true);
    assert.strictEqual(rule, null);
});

// ---- Summary ----

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
