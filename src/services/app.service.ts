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
import { Injectable } from '@angular/core';
import { LabViewerConfig } from 'src/app/models/config/lab-viewer-config.model';
import jwt_decode from "jwt-decode";

@Injectable({
    providedIn: 'root'
})
export class AppService {
    personId: string;
    encounterId: string;
    contexts: string;
    loggedInUserName: string;
    loggedInUserId: string;
    apiServiceReference: any;

    labViewerConfig: LabViewerConfig;

    decodeAccessToken(token: string): any {
        try {
            return jwt_decode(token);
        }
        catch (Error) {
            return null;
        }
    }
}