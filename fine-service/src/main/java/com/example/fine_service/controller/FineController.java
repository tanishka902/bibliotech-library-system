
package com.example.fine_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.example.fine_service.entity.Fine;
import com.example.fine_service.repository.FineRepository;

@RestController
@RequestMapping("/fines")
public class FineController {

    private final FineRepository fineRepository;

    public FineController(FineRepository fineRepository) {
        this.fineRepository = fineRepository;
    }

    @PostMapping("/calculate")
    public Fine calculateFine(@RequestBody Fine fine) {

        if (fine.getDaysLate() < 1) {
            throw new IllegalArgumentException(
                    "Days late must be at least 1");
        }

        String demand = fine.getDemandLevel();

        if (demand == null) {
            demand = "LOW";
        }

        double ratePerDay;

        switch (demand.toUpperCase()) {
            case "LOW":
                ratePerDay = 3.0;
                break;
            case "MEDIUM":
                ratePerDay = 5.0;
                break;
            case "HIGH":
                ratePerDay = 8.0;
                break;
            default:
                throw new IllegalArgumentException(
                        "Demand level must be LOW, MEDIUM, or HIGH");
        }

        fine.setDemandLevel(demand.toUpperCase());
        fine.setAmount(fine.getDaysLate() * ratePerDay);
        fine.setStatus("UNPAID");

        return fineRepository.save(fine);
    }

    @GetMapping
    public List<Fine> getAllFines() {
        return fineRepository.findAll();
    }

    @GetMapping("/{id}")
    public Fine getFine(@PathVariable Long id) {
        return fineRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Fine not found"));
    }

    @PutMapping("/{id}/pay")
    public Fine payFine(@PathVariable Long id) {
        Fine fine = fineRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Fine not found"));

        fine.setStatus("PAID");
        return fineRepository.save(fine);
    }
}
