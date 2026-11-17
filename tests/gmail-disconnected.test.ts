import {describe,it,expect} from 'vitest';
import {gmailActionIntent,gmailNotConnectedReply} from '../src/lib/email-chat';

describe('Gmail disconnected assistance',()=>{
 it.each(['check recent inbox','Open my Gmail','Read latest emails','send email to my teacher','gmail connected?','میرا جی میل کھولو'])('detects the Gmail action: %s',query=>{expect(gmailActionIntent(query)).toBe(true)});
 it.each(['What is Gmail?','Explain the history of email','Write a poem about computers','Hello how are you?'])('does not hijack regular conversation: %s',query=>{expect(gmailActionIntent(query)).toBe(false)});
 it('answers in English with Connected Apps guidance',()=>{
  const reply=gmailNotConnectedReply('open my Gmail','en');
  expect(reply).toMatch(/Gmail is not connected/);
  expect(reply).toContain('Connected Apps');
  expect(reply).toContain('Email Manager');
 });
 it('answers in Roman Urdu',()=>{
  const reply=gmailNotConnectedReply('mera gmail kholo','roman-ur');
  expect(reply).toContain('Gmail abhi connected nahi');
  expect(reply).toContain('Connected Apps');
 });
 it('answers in Urdu script',()=>{
  const reply=gmailNotConnectedReply('میرا جی میل کھولو','ur');
  expect(reply).toContain('کنیکٹ');
  expect(reply).toContain('Connected Apps');
 });
});
