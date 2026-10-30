
package com.example.book_service.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String author;

    @Column(unique = true, nullable = false)
    private String isbn;

    private int totalCopies;
    private int availableCopies;

    @Column(nullable = false)
    private String demandLevel = "LOW";

    public Book() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getIsbn() {
        return isbn;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public int getTotalCopies() {
        return totalCopies;
    }

    public void setTotalCopies(int totalCopies) {
        this.totalCopies = totalCopies;
    }

    public int getAvailableCopies() {
        return availableCopies;
    }

    public void setAvailableCopies(int availableCopies) {
        this.availableCopies = availableCopies;
    }

    public String getDemandLevel() {
        return demandLevel;
    }

    public void setDemandLevel(String demandLevel) {
        if (demandLevel == null ||
                !(demandLevel.equalsIgnoreCase("LOW")
                || demandLevel.equalsIgnoreCase("MEDIUM")
                || demandLevel.equalsIgnoreCase("HIGH"))) {
            throw new IllegalArgumentException(
                    "Demand level must be LOW, MEDIUM, or HIGH");
        }

        this.demandLevel = demandLevel.toUpperCase();
    }
}
