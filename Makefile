IMAGE_TAG ?= m3u-epg_iptv-app_1
NAME_TAG ?= m3u-epg_iptv-app_1
all:;: '$(IMAGE_TAG)'

# Get current directory
current_dir = $(shell pwd)

CMD_DOCKER := docker exec $(NAME_TAG)
CMD_LINT := npm run lint
CMD_TYPECHECK := npm run typecheck
CMD_INSTALL_PKG := npm install
CMD_COMPILE_CODE := npm run build
CMD_TEST_BUILD := npx tsc
CMD_TEST := npm run test
CMD_TEST_UNIT := npm run test:unit
CMD_TEST_FUNCTIONAL := npm run test:functional
CMD_COVERAGE_REPORT := npm run coverage
CMD_BUILD_CONTAINER := docker build --target=develop -t workspace_dm-marketplace_ms-sellerintegration .
CMD_REMOVE_CONTAINER := docker rm -f workspace_dm-marketplace_ms-sellerintegration
CMD_RUN_CONTAINER := docker run --rm -d -it -p 8080:80 -v $(current_dir):/code --name=m3u-epg_iptv-app_1 workspace_dm-marketplace_ms-sellerintegration:latest
CMD_COMPILE_CODE_DOCKER := docker run --rm -it -v $(current_dir):/code --name=$(NAME_TAG) workspace_dm-marketplace_ms-sellerintegration:latest npm run build

install-pkg:
	$(CMD_INSTALL_PKG)

typecheck:
	$(CMD_TYPECHECK)

lint:
	$(CMD_LINT)

docker-lint:
	$(CMD_DOCKER) $(CMD_LINT)

test:
	$(CMD_TEST)

test-unit:
	$(CMD_TEST_UNIT)

test-functional:
	$(CMD_TEST_FUNCTIONAL)

test-build:
	$(CMD_TEST_BUILD)

docker-test:
	$(CMD_DOCKER) $(CMD_TEST_UNIT)
	$(CMD_COVERAGE_REPORT)

# Utilities
shell:
	docker run -it --privileged --rm -v $(current_dir):/code -v $(IMAGE_TAG) sh

# https://github.com/dherault/serverless-offline/issues/931
# we use dev:watch until this issue above is fixed regarding hot reloading
dev:
	npm run start:dev

build-dev:
	docker build --target develop -t $(IMAGE_TAG) .

tag:
	docker tag $(IMAGE_TAG) $(IMAGE_TAG)

push:
	docker push $(IMAGE_TAG)

deploy-localdev:
	NODE_ENV=localdev npx serverless deploy --stage localdev --verbose

remove:
	$(CMD_REMOVE_CONTAINER)

review: test lint
docker-review: docker-test docker-lint
publish: build-dev tag push

guard-%:
	if [ -z '${${*}}' ]; then echo 'Environment variable $* not set' && exit 1; fi
