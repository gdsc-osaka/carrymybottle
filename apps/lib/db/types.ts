import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  adminAuditEvents,
  analyticsEvents,
  buildings,
  campuses,
  emergencyContacts,
  inquiries,
  installationComments,
  installationTargets,
  installationVotes,
  rateLimits,
  stationTemperatures,
  stations,
} from './schema';

export type Campus = InferSelectModel<typeof campuses>;
export type NewCampus = InferInsertModel<typeof campuses>;

export type Building = InferSelectModel<typeof buildings>;
export type NewBuilding = InferInsertModel<typeof buildings>;

export type Station = InferSelectModel<typeof stations>;
export type NewStation = InferInsertModel<typeof stations>;

export type StationTemperature = InferSelectModel<typeof stationTemperatures>;
export type NewStationTemperature = InferInsertModel<
  typeof stationTemperatures
>;

export type InstallationTarget = InferSelectModel<typeof installationTargets>;
export type NewInstallationTarget = InferInsertModel<
  typeof installationTargets
>;

export type InstallationVote = InferSelectModel<typeof installationVotes>;
export type NewInstallationVote = InferInsertModel<typeof installationVotes>;

export type InstallationComment = InferSelectModel<typeof installationComments>;
export type NewInstallationComment = InferInsertModel<
  typeof installationComments
>;

export type EmergencyContact = InferSelectModel<typeof emergencyContacts>;
export type NewEmergencyContact = InferInsertModel<typeof emergencyContacts>;

export type Inquiry = InferSelectModel<typeof inquiries>;
export type NewInquiry = InferInsertModel<typeof inquiries>;

export type AnalyticsEvent = InferSelectModel<typeof analyticsEvents>;
export type NewAnalyticsEvent = InferInsertModel<typeof analyticsEvents>;

export type AdminAuditEvent = InferSelectModel<typeof adminAuditEvents>;
export type NewAdminAuditEvent = InferInsertModel<typeof adminAuditEvents>;

export type RateLimit = InferSelectModel<typeof rateLimits>;
export type NewRateLimit = InferInsertModel<typeof rateLimits>;

export type StationWithRelations = Station & {
  campus: Campus;
  building: Building;
  temperatures: StationTemperature[];
};

export type InstallationTargetWithComments = InstallationTarget & {
  campus: Campus;
  building: Building;
  comments: InstallationComment[];
};

export type EmergencyContactWithStation = EmergencyContact & {
  station: Station;
};
