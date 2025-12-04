SHELL := /bin/bash

NPM ?= npm
PYTHON ?= python3
DOCKER_IMAGE ?= felix-app
DOCKER_TAG ?= latest
DOCKER_CONTAINER ?= felix-app
ENV_FILE ?= .env

ifneq ("$(wildcard $(ENV_FILE))","")
ENV_ARGS := --env-file $(ENV_FILE)
else
ENV_ARGS :=
endif

.PHONY: install install-frontend install-backend dev dev-frontend dev-backend lint type-check docker-build docker-run docker-stop docker-logs docker-shell

install: install-frontend install-backend

install-frontend:
	$(NPM) install

install-backend:
	$(PYTHON) -m pip install -r requirements.txt

dev:
	$(NPM) run dev:all

dev-frontend:
	$(NPM) run dev

dev-backend:
	$(NPM) run dev:python

lint:
	$(NPM) run lint

type-check:
	$(NPM) run type-check

docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker-run:
	docker run --rm -it -p 3000:3000 -p 8000:8000 $(ENV_ARGS) --name $(DOCKER_CONTAINER) $(DOCKER_IMAGE):$(DOCKER_TAG)

docker-stop:
	- docker stop $(DOCKER_CONTAINER)

docker-logs:
	docker logs -f $(DOCKER_CONTAINER)

docker-shell:
	docker exec -it $(DOCKER_CONTAINER) /bin/bash

