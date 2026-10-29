# LimpiApp backend gates (CLAUDE.md, gates 1-4). `make qa` stops at the first failure.
export PATH := $(HOME)/.dotnet:$(PATH)
export DOTNET_CLI_TELEMETRY_OPTOUT := 1
export DOTNET_NOLOGO := 1

COVERAGE_DIR := $(CURDIR)/TestResults/coverage
COVERAGE_MIN := 70
COVERAGE = --coverage --coverage-output-format cobertura --coverage-output $(COVERAGE_DIR)/$(1).cobertura.xml

.PHONY: qa format build unit integration coverage run clean

qa: format build unit integration coverage

format:
	dotnet format LimpiApp.slnx --verify-no-changes --exclude src/LimpiApp.Api/Data/Migrations

build:
	dotnet build LimpiApp.slnx -warnaserror
	dotnet tool restore >/dev/null
	dotnet ef migrations has-pending-model-changes --project src/LimpiApp.Api --no-build

unit:
	rm -rf $(COVERAGE_DIR) && mkdir -p $(COVERAGE_DIR)
	dotnet tool restore >/dev/null
	dotnet test --project tests/LimpiApp.UnitTests --no-build $(call COVERAGE,unit)

integration:
	dotnet test --project tests/LimpiApp.IntegrationTests --no-build $(call COVERAGE,integration)

# Unit + integration merged; fails under COVERAGE_MIN % line coverage of LimpiApp.Api.
coverage:
	dotnet reportgenerator -reports:"$(COVERAGE_DIR)/*.cobertura.xml" -targetdir:$(COVERAGE_DIR)/report \
		-reporttypes:TextSummary -assemblyfilters:+LimpiApp.Api -filefilters:-*/Migrations/* \
		-classfilters:"-Microsoft.Extensions.Validation.Generated*;-System.Runtime.CompilerServices*" -verbosity:Warning
	@awk -v min=$(COVERAGE_MIN) '/Line coverage:/ { gsub("%", "", $$3); printf "Line coverage: %s%% (min %s%%)\n", $$3, min; \
		seen = 1; if ($$3 + 0 < min) { print "FAIL: coverage below threshold"; exit 1 } } \
		END { if (!seen) { print "FAIL: no line coverage in the report"; exit 1 } }' $(COVERAGE_DIR)/report/Summary.txt

run:
	dotnet run --project src/LimpiApp.Api

clean:
	dotnet clean LimpiApp.slnx && rm -rf TestResults
