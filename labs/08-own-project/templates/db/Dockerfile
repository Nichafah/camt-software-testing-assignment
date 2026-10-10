FROM liquibase/liquibase:5.0.4

# Liquibase 5 no longer bundles JDBC drivers.
RUN lpm add postgresql --global

COPY changelog /liquibase/changelog
WORKDIR /liquibase/changelog
