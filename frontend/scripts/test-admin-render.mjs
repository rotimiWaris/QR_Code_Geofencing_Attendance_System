import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Render production components with cached API responses; no dev server required.
const code = `
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {AuthProvider} from './src/contexts/AuthContext';
import {ToastProvider} from './src/contexts/ToastContext';
import {RegistryManager} from './src/components/admin/RegistryManager';
import {UserManagement} from './src/pages/admin/UserManagement';
import {LecturerReports} from './src/pages/lecturer/LecturerReports';
import {ProfilePage} from './src/pages/auth/ProfilePage';
import {SessionActivity} from './src/components/layout/SessionActivity';
const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
const user=JSON.parse(localStorage.getItem('user'));
const row={id:'row1',name:'Real room',code:'COM111',courseCode:'COM111',studentName:'Real Student',studentIdNumber:'REAL001',latitude:null,longitude:null,isActive:true,status:'active',lecturerName:'Real Lecturer',classGroupName:'Real Class',startTime:new Date().toISOString(),totalEnrolled:1,checkedInCount:0};
for(const kind of ['courses','venues','class-groups','enrollments'])client.setQueryData(['admin-registry',kind,'',1],{count:1,next:null,previous:null,results:[row]});
client.setQueryData(['admin-users','','',1],{count:1,next:null,previous:null,results:[user]});
client.setQueryData(['lecturer-report-sessions',user.id,'',1],{count:1,next:null,previous:null,results:[row]});
const wrap=page=>renderToStaticMarkup(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(ToastProvider,null,React.createElement(AuthProvider,null,page)))));
module.exports={registries:['courses','venues','class-groups','enrollments'].map(kind=>wrap(React.createElement(RegistryManager,{kind}))),users:wrap(React.createElement(UserManagement)),reports:wrap(React.createElement(LecturerReports)),profile:wrap(React.createElement(ProfilePage))};
client.setQueryData(['session-activity',user.id],[row]);
module.exports.activityNew=wrap(React.createElement(SessionActivity));
localStorage.setItem('seen-session-notifications:'+user.id,JSON.stringify([row.id]));
module.exports.activityRead=wrap(React.createElement(SessionActivity));
`;
const output = await build({ stdin: { contents: code, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'tsconfig.json', define: { 'import.meta.env.VITE_API_BASE_URL': 'undefined' } });
const module = { exports: {} };
process.env.NODE_ENV = 'production';
const user = { id: 'real-admin', firstName: 'Real', lastName: 'Admin', email: 'real@test.edu', role: 'admin', isActive: true };
const storage = new Map([['user', JSON.stringify(user)]]);
vm.runInNewContext(output.outputFiles[0].text, { module, exports: module.exports, require: createRequire(new URL('../package.json', import.meta.url)), console: { ...console, warn() {}, error() {} }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, navigator: {}, window: {}, setTimeout, clearTimeout, setInterval, clearInterval });
const result = module.exports;
assert.equal(result.registries.length, 4);
for (const html of result.registries) { assert.match(html, /<input/); assert.match(html, /Edit/); assert.match(html, /Remove/); }
assert.match(result.registries[1], /Real room/);
assert.match(result.registries[1], /—/); // Null venue coordinates must not crash.
assert.match(result.registries[3], /REAL001/);
assert.match(result.users, /real@test.edu/);
assert.match(result.users, /Reset password/);
assert.match(result.reports, /\/admin\/reports\/row1/);
assert.match(result.profile, /Change password/);
assert.match(result.activityNew, /notification-badge/);
assert.match(result.activityNew, /1 unread notifications/);
assert.doesNotMatch(result.activityRead, /notification-badge/);
console.log('Passed: all academic registry tabs, real users, null coordinates, admin report links, and profile rendering.');
