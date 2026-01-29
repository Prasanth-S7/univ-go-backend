package handlers

import (
	"github.com/Prasanth-S7/univ-go-backend/utils"
)

type Handler struct {
	Cfg *utils.Config
}

func NewHandler(cfg *utils.Config) *Handler {
	return &Handler{Cfg: cfg}
}
