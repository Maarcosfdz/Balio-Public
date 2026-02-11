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