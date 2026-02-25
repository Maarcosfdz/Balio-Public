# Balio
Traballo de fin de grado, aplicación de xestión persoal. Versión privada.


# Iniciar

1. Abrir docker desktop 
2. Na raiz escribir o seguinte:
   
         docker-compose up -d


# Iniciar no back

mvn spring-boot:run


# Mirar a bd

docker exec -it balio-postgres psql -U balio -d balio -c 





######

bd con coker e postgree
migracions con flyway

jacoco e rompe con menos dun 80 de cobertura

o editconfig do checkstyle



-------

swagger

http://localhost:8080/swagger-ui/index.html

http://localhost:8080/v3/api-docs

------

jacoco

Todo 

./mvnw verify

Eso ejecuta en orden:

Tests unitarios (Surefire) → genera target/jacoco-ut.exec
Tests de integración (Failsafe) → genera target/jacoco-it.exec
Reporte JaCoCo → genera target/site/jacoco/index.html
Si quieres saltarte Checkstyle para ir más rápido:

./mvnw verify -Dcheckstyle.skip=true