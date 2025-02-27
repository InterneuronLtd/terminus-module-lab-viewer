//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { EntityBase } from './entity-base.model';

export class CoreNote extends EntityBase {
    note_id: string;
	person_id: string;
	encounter_id: string;
	parentid: string;
	setid: number;
	sourceofcomment: string;
	comment: string;
	enteredby: string;
	entereddatetime: Date;
	entereddatetimets: Date;
	effectivestartdate: Date;
	effectivestartdatets: Date;
	expirationdate: Date;
	expirationdatets: Date;
	parentname: string;
	commenttypecode: string;
	commenttypetext: string;
	commenttypecodingsystem: string;
}