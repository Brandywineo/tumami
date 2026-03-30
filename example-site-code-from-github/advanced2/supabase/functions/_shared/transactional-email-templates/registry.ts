/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as depositApproved } from './deposit-approved.tsx'
import { template as depositRejected } from './deposit-rejected.tsx'
import { template as depositSubmitted } from './deposit-submitted.tsx'
import { template as errandCreated } from './errand-created.tsx'
import { template as errandStatusChanged } from './errand-status-changed.tsx'
import { template as runnerApproved } from './runner-approved.tsx'
import { template as runnerRejected } from './runner-rejected.tsx'
import { template as withdrawalApproved } from './withdrawal-approved.tsx'
import { template as withdrawalRejected } from './withdrawal-rejected.tsx'
import { template as withdrawalRequested } from './withdrawal-requested.tsx'
import { template as welcomeEmail } from './welcome-email.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'deposit-approved': depositApproved,
  'deposit-rejected': depositRejected,
  'deposit-submitted': depositSubmitted,
  'errand-created': errandCreated,
  'errand-status-changed': errandStatusChanged,
  'runner-approved': runnerApproved,
  'runner-rejected': runnerRejected,
  'withdrawal-approved': withdrawalApproved,
  'withdrawal-rejected': withdrawalRejected,
  'withdrawal-requested': withdrawalRequested,
  'welcome-email': welcomeEmail,
}
