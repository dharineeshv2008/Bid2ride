import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TrendingUp, Car, BarChart3, Calendar, DollarSign, Award, Zap, Clock, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';
