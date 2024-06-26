FROM ubuntu:jammy
RUN apt update -y && apt upgrade -y && apt install git curl -y
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &&\
    apt install -y nodejs

RUN npx playwright install-deps && npx playwright install