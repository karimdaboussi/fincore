FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system fincore && useradd --system --gid fincore fincore
COPY --from=build /app/target/fincore-1.0.0.jar app.jar
USER fincore
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
