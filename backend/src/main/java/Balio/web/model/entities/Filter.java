package Balio.web.model.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "filters")
public class Filter {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 80)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String definition;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    protected Filter() {}

    public Filter(String name, String definition, User user) {
        this.name = name;
        this.definition = definition;
        this.user = user;
    }

    public UUID getId() {return id;}

    public String getName() {return name;}

    public void setName(String name) {this.name = name;}

    public String getDefinition() {return definition;}

    public void setDefinition(String definition) {this.definition = definition;}

    public User getUser() {return user;}
}