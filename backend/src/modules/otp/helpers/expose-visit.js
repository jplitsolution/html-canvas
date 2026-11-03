import { VisitStatus } from '../../../database/entities/visit.entity.js';

export const isTerminalExposeVisit = (visit) => {
  if (!visit) return false;
  if (visit.otpVerifiedAt) return true;
  return (
    visit.visitStatus === VisitStatus.SUCCESS ||
    visit.visitStatus === VisitStatus.SUBSCRIBED
  );
};

/** Undefined means leave the stored visit status alone. */
export const exposeVisitStatusPatch = (existing, requested) => {
  if (!requested) return undefined;
  if (isTerminalExposeVisit(existing)) return undefined;
  return requested;
};

const textOf = (part) => {
  if (part == null) return '';
  if (typeof part === 'string') return part;
  try {
    return JSON.stringify(part);
  } catch {
    return String(part);
  }
};

export const isAlreadySubscribedText = (...parts) =>
  parts.some((part) => /already\s+subscribed/i.test(textOf(part)));
