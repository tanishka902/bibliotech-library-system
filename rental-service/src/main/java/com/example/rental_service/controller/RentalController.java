
package com.example.rental_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.example.rental_service.entity.Rental;
import com.example.rental_service.service.RentalService;

@RestController
@RequestMapping("/rentals")
public class RentalController {

    private final RentalService rentalService;

    public RentalController(RentalService rentalService) {
        this.rentalService = rentalService;
    }

    @PostMapping("/borrow")
    public Rental borrowBook(@RequestBody Rental rental) {
        return rentalService.borrowBook(rental);
    }

    @GetMapping
    public List<Rental> getAllRentals() {
        return rentalService.getAllRentals();
    }

    @GetMapping("/{id}")
    public Rental getRental(@PathVariable Long id) {
        return rentalService.getRental(id);
    }

    @PutMapping("/{id}/return")
    public Rental returnBook(@PathVariable Long id) {
        return rentalService.returnBook(id);
    }
}
