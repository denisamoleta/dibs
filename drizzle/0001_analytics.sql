CREATE TABLE "analytics_daily" (
	"day" date NOT NULL,
	"metric" varchar(32) NOT NULL,
	"dim" varchar(96) DEFAULT '' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "analytics_daily_day_metric_dim_pk" PRIMARY KEY("day","metric","dim")
);
--> statement-breakpoint
CREATE TABLE "analytics_visitors" (
	"day" date NOT NULL,
	"hash" varchar(32) NOT NULL,
	CONSTRAINT "analytics_visitors_day_hash_pk" PRIMARY KEY("day","hash")
);
