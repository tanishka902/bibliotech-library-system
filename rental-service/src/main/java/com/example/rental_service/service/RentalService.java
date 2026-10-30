
package com.example.rental_service.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.example.rental_service.entity.Rental;
import com.example.rental_service.repository.RentalRepository;

@Service
public class RentalService {

    private final RentalRepository rentalRepository;
    private final RestClient restClient;

    public RentalService(RentalRepository rentalRepository) {
        this.rentalRepository = rentalRepository;
        this.restClient = RestClient.builder().build();
    }

    public Rental borrowBook(Rental rental) {
        if (rental.getBookId() == null
                || rental.getUserEmail() == null
                || rental.getUserEmail().isBlank()
                || rental.getDueDate() == null) {
            throw new IllegalArgumentException(
                    "Book ID, user email and due date are required");
        }

        if (!rental.getDueDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Due date must be in the future");
        }

        restClient.post()
                .uri("http://localhost:8082/books/{id}/borrow",
                        rental.getBookId())
                .retrieve()
                .toBodilessEntity();

        rental.setBorrowDate(LocalDate.now());
        rental.setReturnDate(null);
        rental.setStatus("BORROWED");

        return rentalRepository.save(rental);
    }

    public List<Rental> getAllRentals() {
        return rentalRepository.findAll();
    }

    public Rental getRental(Long id) {
        return rentalRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Rental not found"));
    }

    public Rental returnBook(Long id) {
        Rental rental = getRental(id);

        if (!"BORROWED".equals(rental.getStatus())) {
            throw new IllegalArgumentException(
                    "This rental has already been returned");
        }

        LocalDate today = LocalDate.now();

        long daysLate = rental.getDueDate() == null ? 0
                : Math.max(0, ChronoUnit.DAYS.between(
                        rental.getDueDate(), today));

        BookResponse book = restClient.get()
                .uri("http://localhost:8082/books/{id}",
                        rental.getBookId())
                .retrieve()
                .body(BookResponse.class);

        if (book == null || book.demandLevel == null) {
            throw new IllegalStateException(
                    "Could not retrieve book demand level");
        }

        restClient.post()
                .uri("http://localhost:8082/books/{id}/return",
                        rental.getBookId())
                .retrieve()
                .toBodilessEntity();

        rental.setReturnDate(today);
        rental.setStatus("RETURNED");

        Rental savedRental = rentalRepository.save(rental);

        if (daysLate > 0) {
            FineRequest request = new FineRequest(
                    savedRental.getId(),
                    savedRental.getUserEmail(),
                    (int) daysLate,
                    book.demandLevel);

            restClient.post()
                    .uri("http://localhost:8084/fines/calculate")
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        }

        return savedRental;
    }

    public static class BookResponse {
        public Long id;
        public String title;
        public String author;
        public String isbn;
        public int totalCopies;
        public int availableCopies;
        public String demandLevel;

        public BookResponse() {
        }
    }

    public record FineRequest(
            Long rentalId,
            String userEmail,
            int daysLate,
            String demandLevel) {
    }
}
